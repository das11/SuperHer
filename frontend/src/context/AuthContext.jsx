import React, { createContext, useContext, useState, useEffect } from 'react';
import { CognitoUserPool, CognitoUser, AuthenticationDetails } from 'amazon-cognito-identity-js';
import axios from 'axios';
import client from '../api/client';

// --- CONFIGURATION ---
// IMPORTANT: These values should ideally come from import.meta.env
// But for now we might need to hardcode if env vars aren't set up,
// or use placeholders.
const poolData = {
    UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || 'us-east-1_PLACEHOLDER',
    ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID || 'PLACEHOLDER_CLIENT_ID',
};

const UserPool = new CognitoUserPool(poolData);

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null); // Local user obj with attributes
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // --- ACTIONS ---

    const signup = (email, password, name, role = 'ADVERTISER') => {
        return new Promise((resolve, reject) => {
            const attributeList = [
                { Name: 'name', Value: name },
                { Name: 'email', Value: email },
                { Name: 'custom:role', Value: role },
            ];

            UserPool.signUp(email, password, attributeList, null, (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
    };

    const login = (email, password) => {
        return new Promise((resolve, reject) => {
            const user = new CognitoUser({ Username: email, Pool: UserPool });
            const authDetails = new AuthenticationDetails({ Username: email, Password: password });

            user.authenticateUser(authDetails, {
                onSuccess: (data) => {
                    // data.getIdToken().getJwtToken()
                    // We should fetch full user details after login or just rely on session
                    fetchUserFromSession(user)
                        .then(() => resolve(data))
                        .catch((e) => reject(e)); // Should handle sync error?
                },
                onFailure: (err) => {
                    reject(err);
                },
                newPasswordRequired: (userAttributes) => {
                    // Handle force change password if needed
                    // For MVP, maybe just reject or handle simple?
                    // attributes usually contain required info
                    delete userAttributes.email_verified;
                    // user.completeNewPasswordChallenge(newPassword, userAttributes, this);
                    reject(new Error("Password change required. Flow not implemented yet."));
                },
            });
        });
    };

    const logout = () => {
        const user = UserPool.getCurrentUser();
        if (user) {
            user.signOut();
        }
        setUser(null);
    };

    const verifyCode = (email, code) => {
        return new Promise((resolve, reject) => {
            const user = new CognitoUser({ Username: email, Pool: UserPool });
            user.confirmRegistration(code, true, (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });
    };

    const fetchUserFromSession = async (cognitoUser) => {
        return new Promise((resolve, reject) => {
            cognitoUser.getSession(async (err, session) => {
                if (err) {
                    reject(err);
                    return;
                }
                if (!session.isValid()) {
                    reject("Session invalid");
                    return;
                }

                // Get Token
                const token = session.getIdToken().getJwtToken();

                // Sync/Fetch from Backend to get DB User (and status)
                try {
                    // [RACE CONDITION FIX]
                    // Synchronously attach token to client defaults BEFORE we verify or update state.
                    // This ensures any component mounting immediately after loading=false will validly have the token.
                    client.defaults.headers.common['Authorization'] = `Bearer ${token}`;

                    // Temporary: We still use axios directly here for the auth check itself to avoid circular oddities
                    // or just use the same client? Let's stick to axios for this specific 'me' call or client?
                    // Safe to use axios.get since client has the header now? No, use axios with manual header to be explicit.
                    const response = await axios.get('/api/v1/auth/me', {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    const dbUser = response.data;
                    setUser({
                        ...dbUser,
                        cognitoUser: cognitoUser, // keep ref to cognito object
                        token: token
                    });
                    resolve(dbUser);
                } catch (err) {
                    console.error("Failed to sync user with backend", err);
                    client.defaults.headers.common['Authorization'] = null; // cleanup
                    reject(err);
                }
            });
        });
    }

    // --- EFFECT: CHECK SESSION ON MOUNT ---
    useEffect(() => {
        const cognitoUser = UserPool.getCurrentUser();
        if (cognitoUser) {
            fetchUserFromSession(cognitoUser)
                .then(() => setLoading(false))
                .catch(() => {
                    setLoading(false);
                });
        } else {
            setLoading(false);
        }
    }, []);

    // --- AXIOS INTERCEPTOR ---
    // Automatically add token to requests (Dynamic updates)
    useEffect(() => {
        const reqInterceptor = client.interceptors.request.use(
            (config) => {
                if (user && user.token) {
                    config.headers.Authorization = `Bearer ${user.token}`;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        return () => {
            client.interceptors.request.eject(reqInterceptor);
        }
    }, [user]);

    const value = {
        user,
        loading,
        error,
        login,
        logout,
        signup,
        verifyCode
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    return useContext(AuthContext);
};
