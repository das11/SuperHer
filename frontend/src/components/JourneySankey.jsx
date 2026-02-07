import React, { useMemo } from 'react';
import { ResponsiveSankey } from '@nivo/sankey';
import { motion } from 'framer-motion';

const JourneySankey = ({ data, loading }) => {
    // Transform backend data { source, method, event_type, count } into { nodes, links }
    const sankeyData = useMemo(() => {
        if (!data || data.length === 0) return { nodes: [], links: [] };

        const nodesMap = new Map();
        const linksMap = new Map();

        // Helper to get/create node ID
        const getNode = (id, layer) => {
            if (!nodesMap.has(id)) {
                nodesMap.set(id, { id, layer });
            }
            return id;
        };

        const addLink = (source, target, value) => {
            const key = `${source}->${target}`;
            const current = linksMap.get(key) || 0;
            linksMap.set(key, current + value);
        };

        data.forEach(row => {
            // Unpack row
            const source = row.source;   // Layer 0
            const method = row.method;   // Layer 1
            const event = row.event_type; // Layer 2 (Outcome)
            const count = row.count;

            // Ensure nodes exist
            getNode(source, 0);
            getNode(method, 1);

            // Format event node nicely (e.g. "purchase" -> "Purchase")
            const eventLabel = event.charAt(0).toUpperCase() + event.slice(1);
            getNode(eventLabel, 2);

            // Create Flows
            // 1. Source -> Method
            addLink(source, method, count);

            // 2. Method -> Outcome
            addLink(method, eventLabel, count);
        });

        // Convert to Arrays
        const nodes = Array.from(nodesMap.entries())
            .map(([id, meta]) => ({
                id,
                nodeColor: meta.layer === 0 ? '#3b82f6' : meta.layer === 1 ? '#a855f7' : '#10b981'
            }))
            // Sort roughly by layer to ensure render order (Nivo handles this but good to be clean)
            .sort((a, b) => (nodesMap.get(a.id).layer - nodesMap.get(b.id).layer));

        const links = Array.from(linksMap.entries()).map(([key, value]) => {
            const [source, target] = key.split('->');
            return { source, target, value };
        });

        return { nodes, links };
    }, [data]);

    if (loading) {
        return (
            <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-xl h-[500px] flex flex-col items-center justify-center">
                <div className="text-gray-400 animate-pulse text-sm">Loading journey data...</div>
            </div>
        );
    }

    if (sankeyData.nodes.length === 0) {
        return (
            <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-xl h-[500px] flex flex-col items-center justify-center">
                <div className="text-gray-400 text-sm">No journey data available for this period</div>
            </div>
        );
    }

    // SVG gradients often fail to render in Safari (leading to invisible flows)
    // We disable gradients specifically for Safari to ensure visibility.
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white border border-gray-100 rounded-3xl p-8 shadow-xl h-[500px] flex flex-col"
        >
            <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-800">Attribution Journey</h3>
                <p className="text-gray-500 text-sm">Flow of traffic from Source → Attribution → Outcome</p>
            </div>

            <div className="flex-1">
                <ResponsiveSankey
                    data={sankeyData}
                    margin={{ top: 20, right: 50, bottom: 20, left: 50 }}
                    align="justify"
                    colors={node => node.nodeColor || '#cbd5e1'}
                    nodeOpacity={1}
                    nodeHoverOthersOpacity={0.35}
                    nodeThickness={18}
                    nodeSpacing={24}
                    nodeBorderWidth={0}
                    nodeBorderColor={{ from: 'color', modifiers: [['darker', 0.8]] }}
                    borderRadius={3}
                    linkOpacity={0.5}
                    linkHoverOthersOpacity={0.1}
                    linkContract={3}
                    enableLinkGradient={!isSafari}
                    labelPosition="outside"
                    labelOrientation="vertical"
                    labelPadding={16}
                    labelTextColor={{ from: 'color', modifiers: [['darker', 1]] }}
                    theme={{
                        labels: {
                            text: {
                                fontSize: 13,
                                fontWeight: 600,
                            }
                        }
                    }}
                    tooltip={({ node }) => (
                        <div className="bg-white px-3 py-1.5 shadow-xl border border-gray-100 rounded-lg text-xs font-medium text-gray-700 whitespace-nowrap flex items-center gap-2">
                            <span>{node.id}:</span>
                            <span className="font-bold text-indigo-600">{node.value}</span>
                        </div>
                    )}
                    linkTooltip={({ link }) => (
                        <div className="bg-white px-3 py-1.5 shadow-xl border border-gray-100 rounded-lg text-xs font-medium text-gray-700 whitespace-nowrap flex items-center gap-2">
                            <span>{link.source.id} → {link.target.id}:</span>
                            <span className="font-bold text-indigo-600">{link.value}</span>
                        </div>
                    )}
                />
            </div>

            {/* Legend / Info */}
            <div className="mt-4 flex gap-6 justify-center text-xs text-gray-500 border-t border-gray-50 pt-4">
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                    <span>Traffic Source</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                    <span>Attribution Method</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                    <span>Event Outcome</span>
                </div>
            </div>
        </motion.div>
    );
};

export default JourneySankey;
