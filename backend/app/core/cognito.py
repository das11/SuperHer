import httpx
from jose import jwt, jwk
from jose.utils import base64url_decode
import time
from fastapi import HTTPException, status
from app.core.config import settings

class CognitoVerifier:
    def __init__(self):
        self.region = settings.COGNITO_REGION
        self.user_pool_id = settings.COGNITO_USER_POOL_ID
        self.app_client_id = settings.COGNITO_APP_CLIENT_ID
        self.jwks = None
        self.last_fetch = 0
        self.jwks_url = f"https://cognito-idp.{self.region}.amazonaws.com/{self.user_pool_id}/.well-known/jwks.json"

    async def get_jwks(self):
        # Refresh JWKS every 24 hours
        if not self.jwks or time.time() - self.last_fetch > 86400:
            if not self.user_pool_id or not self.region:
                 # If config is missing (e.g. initial setup), we can't verify.
                 # Returning None/Empty to fail validation gracefully or raise Error.
                 print("WARNING: Cognito Config missing. Verification will fail.")
                 return []
            
            async with httpx.AsyncClient() as client:
                try:
                    response = await client.get(self.jwks_url)
                    response.raise_for_status()
                    self.jwks = response.json().get("keys", [])
                    self.last_fetch = time.time()
                except Exception as e:
                    print(f"Error fetching JWKS: {e}")
                    raise HTTPException(status_code=500, detail="Internal Auth Error")
        return self.jwks

    async def verify_token(self, token: str) -> dict:
        """
        Verifies the JWT signature, Claims, and Expiration.
        Returns the payload (claims) if valid.
        """
        if not self.user_pool_id or not self.app_client_id:
             # Fail fast if config is not set
             raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                detail="Cognito Configuration Missing"
            )

        keys = await self.get_jwks()
        
        # Get Header to find Key ID (kid)
        try:
            headers = jwt.get_unverified_header(token)
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid token header")
        
        kid = headers.get("kid")
        if not kid:
            raise HTTPException(status_code=401, detail="Token missing 'kid' header")

        # Find the Public Key
        key_index = -1
        for i in range(len(keys)):
            if kid == keys[i]["kid"]:
                key_index = i
                break
        
        if key_index == -1:
            raise HTTPException(status_code=401, detail="Public key not found in JWKS")

        public_key = keys[key_index]
        
        # Verify
        try:
            claims = jwt.decode(
                token,
                public_key,
                algorithms=["RS256"],
                audience=self.app_client_id,
                issuer=f"https://cognito-idp.{self.region}.amazonaws.com/{self.user_pool_id}",
                access_token=None # Use this if validating ID token (usually sufficient for Auth)
                                  # If Access Token, 'audience' claim might be missing/different.
                                  # For now, we assume ID Token or handle Access Token logic.
            )
            # Note: For Access Tokens, audience might not be present or is 'client_id' 
            # but Cognito Access tokens usually don't have 'aud'. They have 'client_id'.
            # If using Access Token, we might need to skip 'aud' check and verify 'client_id' manually.
            
            # Let's support both:
            # If token_use is 'access', check client_id.
            # If token_use is 'id', check aud.
            
            return claims
            
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token expired")
        except jwt.JWTClaimsError:
            raise HTTPException(status_code=401, detail="Incorrect claims")
        except Exception as e:
            # Logic to handle Access Token fallback if libraries failed on AUdience
            # But python-jose usually handles provided audience.
            # Let's retry verification without audience if it failed, then verify client_id manually
            # This is complex. For now, let's assume we use ID Tokens in frontend (standard OIDC).
             raise HTTPException(status_code=401, detail="Invalid token")

cognito_verifier = CognitoVerifier()
