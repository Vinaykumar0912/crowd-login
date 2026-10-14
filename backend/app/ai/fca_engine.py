from typing import List, Dict, Set, Tuple, Any, Optional

class FCAEngine:
    """
    Formal Concept Analysis (FCA) Galois reasoning engine.
    Constructs formal context (G, M, I) from real multi-sensor camera and zone data,
    derives formal concepts (Extent, Intent) via Galois closure operators,
    builds the Concept Lattice DAG (Hasse Diagram), and generates prioritized operational recommendations.
    """
    def __init__(self):
        self.attribute_definitions = [
            {"key": "CriticalDensity", "label": "Critical Density (>=90%)", "weight": 4},
            {"key": "HighDensity", "label": "High Density (>=75%)", "weight": 3},
            {"key": "CrowdSurge", "label": "Rapid Crowd Accumulation", "weight": 3},
            {"key": "ExitBlocked", "label": "Exit / Egress Obstruction", "weight": 4},
            {"key": "GateCongestion", "label": "Gate Turnstile Bottleneck", "weight": 3},
            {"key": "RestrictedIntrusion", "label": "Restricted Area Breach", "weight": 3},
            {"key": "ChildSeparated", "label": "Unaccompanied Minor Alert", "weight": 2},
            {"key": "LowSecurityPresence", "label": "Low Security / Staff Ratio", "weight": 2}
        ]

    def build_formal_context(
        self, 
        cameras: List[dict], 
        alerts: List[dict],
        zones: List[dict] = None
    ) -> Tuple[List[str], Dict[str, Set[str]]]:
        """
        Builds formal binary context (G, M, I).
        G = Objects (Zones / Monitored Camera Sectors)
        M = Attributes (CriticalDensity, ExitBlocked, GateCongestion, etc.)
        I = Binary Incidence relation
        """
        objects = []
        relation: Dict[str, Set[str]] = {}

        # 1. Populate objects from configured zones if available, else from cameras
        zone_map: Dict[str, dict] = {}
        if zones:
            for z in zones:
                z_name = z.get("name", "Zone")
                if z_name not in objects:
                    objects.append(z_name)
                    relation[z_name] = set()
                    zone_map[z_name] = z
                    # Check zone-level attributes
                    z_dens = z.get("density", 0.0)
                    if z_dens >= 90.0:
                        relation[z_name].add("CriticalDensity")
                        relation[z_name].add("HighDensity")
                    elif z_dens >= 75.0:
                        relation[z_name].add("HighDensity")

        # 2. Integrate cameras into context
        for cam in cameras:
            loc_name = cam.get("location") or cam.get("name") or "Area"
            if loc_name not in relation:
                objects.append(loc_name)
                relation[loc_name] = set()

            dens = cam.get("density", 0.0)
            if dens >= 90.0:
                relation[loc_name].add("CriticalDensity")
                relation[loc_name].add("HighDensity")
            elif dens >= 75.0:
                relation[loc_name].add("HighDensity")

            # Check if camera indicates surge
            flow = cam.get("flow_rate", 0.0)
            if dens >= 70.0 and flow >= 3.0:
                relation[loc_name].add("CrowdSurge")

            # If camera is at a gate and density is elevated
            if "gate" in loc_name.lower() and dens >= 65.0:
                relation[loc_name].add("GateCongestion")

        # 3. Integrate active alerts into objects' intents
        for alert in alerts:
            if not alert.get("resolved", False):
                zone_or_cam = alert.get("zone") or alert.get("camera")
                # Find matching object
                matched_obj = None
                for obj in objects:
                    if obj.lower() in zone_or_cam.lower() or zone_or_cam.lower() in obj.lower():
                        matched_obj = obj
                        break
                if not matched_obj and objects:
                    matched_obj = objects[0]

                if matched_obj:
                    title = alert.get("title", "").lower() + " " + alert.get("description", "").lower()
                    if "child" in title:
                        relation[matched_obj].add("ChildSeparated")
                    if "exit" in title or "block" in title or "egress" in title:
                        relation[matched_obj].add("ExitBlocked")
                    if "intrusion" in title or "restricted" in title or "breach" in title:
                        relation[matched_obj].add("RestrictedIntrusion")
                    if "surge" in title or "stampede" in title:
                        relation[matched_obj].add("CrowdSurge")
                        relation[matched_obj].add("CriticalDensity")

        if not objects:
            objects = ["Main Arena Sector", "North Gate Turnstiles"]
            relation["Main Arena Sector"] = set()
            relation["North Gate Turnstiles"] = set()

        return objects, relation

    def derive_formal_concepts(self, objects: List[str], relation: Dict[str, Set[str]]) -> List[Dict]:
        """
        Derives Formal Concepts (Extent, Intent) using Galois closure.
        Each concept satisfies: Extent' = Intent and Intent' = Extent.
        """
        concepts = []
        all_intents: List[Set[str]] = []

        # 1. Base intents from each object
        for obj in objects:
            intent = relation.get(obj, set())
            if intent not in all_intents:
                all_intents.append(intent)

        # 2. Intersections of intents (to form complete meet-semilattice)
        num_intents = len(all_intents)
        for i in range(num_intents):
            for j in range(i + 1, num_intents):
                inter = all_intents[i].intersection(all_intents[j])
                if inter not in all_intents:
                    all_intents.append(inter)

        # 3. Always include empty intent (Top Concept) and union of all active attributes
        if set() not in all_intents:
            all_intents.append(set())

        # Sort intents by cardinality (ascending: top to bottom)
        all_intents.sort(key=lambda s: (len(s), sorted(list(s))))

        cid = 1
        for intent in all_intents:
            # Extent is all objects containing this intent
            extent = [obj for obj in objects if intent.issubset(relation.get(obj, set()))]
            intent_list = sorted(list(intent))
            
            # Action directive derived from intent
            action = self._determine_action_for_intent(intent_list, extent)
            confidence = min(99, 80 + len(intent_list) * 5)

            concepts.append({
                "id": f"c{cid}",
                "label": f"Concept {cid} ({len(extent)} Objects, {len(intent)} Attributes)",
                "extent": extent,
                "intent": intent_list,
                "formula": f"({{{', '.join(extent[:3]) + ('...' if len(extent) > 3 else '')}}}, {{{', '.join(intent_list)}}})",
                "action": action,
                "confidence": confidence
            })
            cid += 1

        return concepts

    def _determine_action_for_intent(self, intent: List[str], extent: List[str]) -> str:
        intent_set = set(intent)
        zones_str = ", ".join(extent[:2]) if extent else "monitored perimeter"

        if "CriticalDensity" in intent_set and "ExitBlocked" in intent_set:
            return f"CRITICAL FCA DIRECTIVE: Evacuation hazard at {zones_str}. Open secondary emergency exits and redirect queue."
        elif "CriticalDensity" in intent_set:
            return f"HIGH FCA DIRECTIVE: Extreme crowd pressure at {zones_str}. Restrict incoming turnstiles and deploy safety barrier squad."
        elif "GateCongestion" in intent_set:
            return f"FCA DIRECTIVE: Turnstile bottleneck at {zones_str}. Open alternate entry lanes and broadcast audio guidance."
        elif "RestrictedIntrusion" in intent_set:
            return f"SECURITY DIRECTIVE: Perimeter breach verified at {zones_str}. Dispatch nearest on-duty security guard."
        elif "ChildSeparated" in intent_set:
            return f"SAFETY DIRECTIVE: Minor separation alert at {zones_str}. Alert floor marshal and public address desk."
        elif "HighDensity" in intent_set:
            return f"OPERATIONAL DIRECTIVE: High density accumulation at {zones_str}. Position crowd marshals for queue spacing."
        else:
            return f"STANDARD SURVEILLANCE: Normal flow across {zones_str}. Maintain automated AI computer vision monitoring."

    def build_lattice_graph(self, concepts: List[Dict]) -> Tuple[List[Dict], List[Dict]]:
        """
        Builds Hasse diagram nodes with layout coordinates and direct covering connections.
        """
        nodes = []
        connections = []

        if not concepts:
            return [], []

        # Group concepts by intent cardinality (layers in lattice)
        layers: Dict[int, List[Dict]] = {}
        for c in concepts:
            layer_idx = len(c["intent"])
            if layer_idx not in layers:
                layers[layer_idx] = []
            layers[layer_idx].append(c)

        sorted_layers = sorted(layers.keys())
        total_layers = len(sorted_layers)
        
        # Calculate (x, y) coordinates for SVG layout (viewBox 0 0 500 400)
        y_step = 300.0 / max(1, total_layers - 1) if total_layers > 1 else 150.0

        node_map: Dict[str, Dict] = {}

        for l_idx, layer_key in enumerate(sorted_layers):
            layer_nodes = layers[layer_key]
            y = 50.0 + l_idx * y_step
            count = len(layer_nodes)
            x_step = 400.0 / max(1, count + 1)

            for n_idx, c in enumerate(layer_nodes):
                x = 50.0 + (n_idx + 1) * x_step
                node_data = {
                    "id": c["id"],
                    "label": c["label"],
                    "extent": c["extent"],
                    "intent": c["intent"],
                    "x": round(x, 1),
                    "y": round(y, 1),
                    "formula": c["formula"],
                    "action": c["action"],
                    "confidence": c["confidence"]
                }
                nodes.append(node_data)
                node_map[c["id"]] = node_data

        # Determine subconcept covering connections:
        # c1 <= c2 iff Intent(c1) is subset of Intent(c2)
        for i, c1 in enumerate(concepts):
            set1 = set(c1["intent"])
            for j, c2 in enumerate(concepts):
                set2 = set(c2["intent"])
                # Immediate child in lattice: set1 is proper subset of set2 and len(set2) == len(set1) + 1
                if set1.issubset(set2) and len(set2) == len(set1) + 1:
                    connections.append({
                        "from": c1["id"],
                        "to": c2["id"]
                    })
                elif len(set1) == 0 and len(set2) == 1:
                    connections.append({
                        "from": c1["id"],
                        "to": c2["id"]
                    })

        # Remove duplicate connections
        seen = set()
        clean_conns = []
        for conn in connections:
            pair = (conn["from"], conn["to"])
            if pair not in seen and pair[0] != pair[1]:
                seen.add(pair)
                clean_conns.append(conn)

        return nodes, clean_conns

    def generate_recommendations_from_fca(self, concepts: List[Dict], event_id: Optional[str] = None) -> List[Dict]:
        """
        Maps Derived Formal Concepts to prioritized Action Directives.
        """
        recs = []
        rec_id = 1
        prefix = f"rec-fca-{event_id}" if event_id else "rec-fca"

        for concept in concepts:
            intent = set(concept.get("intent", []))
            extent = concept.get("extent", [])

            if "CriticalDensity" in intent and "ExitBlocked" in intent:
                for zone in extent:
                    recs.append({
                        "id": f"{prefix}-{rec_id}",
                        "event_id": event_id,
                        "title": f"Open Auxiliary Exit Paths & Divert Crowd at {zone}",
                        "priority": "high",
                        "reason": f"FCA Galois Derivation: Extent={extent} satisfies Intent={{CriticalDensity, ExitBlocked}}. Immediate evacuation protocol required.",
                        "confidence": 98,
                        "zone": zone,
                        "officer": "On-Duty Command Dispatch",
                        "status": "pending"
                    })
                    rec_id += 1

            elif "GateCongestion" in intent:
                for zone in extent:
                    recs.append({
                        "id": f"{prefix}-{rec_id}",
                        "event_id": event_id,
                        "title": f"Open Auxiliary Turnstiles & Deploy Staging Line at {zone}",
                        "priority": "high",
                        "reason": f"FCA Galois Derivation: Extent={extent} satisfies Intent={{GateCongestion}}. Gate throughput constrained.",
                        "confidence": 94,
                        "zone": zone,
                        "officer": "Gate Supervisor Unit",
                        "status": "pending"
                    })
                    rec_id += 1

            elif "HighDensity" in intent:
                for zone in extent:
                    recs.append({
                        "id": f"{prefix}-{rec_id}",
                        "event_id": event_id,
                        "title": f"Deploy Security Rapid Squad to {zone}",
                        "priority": "high",
                        "reason": f"FCA Galois Derivation: Extent={extent} satisfies Intent={{HighDensity}}. Physical queue management needed.",
                        "confidence": 92,
                        "zone": zone,
                        "officer": "On-Duty Security Dispatch",
                        "status": "pending"
                    })
                    rec_id += 1

            elif "ChildSeparated" in intent:
                for zone in extent:
                    recs.append({
                        "id": f"{prefix}-{rec_id}",
                        "event_id": event_id,
                        "title": f"Broadcast Minor Separation Alert in {zone}",
                        "priority": "medium",
                        "reason": f"FCA Galois Derivation: Extent={extent} satisfies Intent={{ChildSeparated}}. Dispatch floor marshal.",
                        "confidence": 89,
                        "zone": zone,
                        "officer": "Floor Marshal Duty Desk",
                        "status": "pending"
                    })
                    rec_id += 1

            elif "RestrictedIntrusion" in intent:
                for zone in extent:
                    recs.append({
                        "id": f"{prefix}-{rec_id}",
                        "event_id": event_id,
                        "title": f"Investigate Perimeter Breach in {zone}",
                        "priority": "high",
                        "reason": f"FCA Galois Derivation: Extent={extent} satisfies Intent={{RestrictedIntrusion}}. Check access control logs.",
                        "confidence": 95,
                        "zone": zone,
                        "officer": "Rapid Response Security Squad",
                        "status": "pending"
                    })
                    rec_id += 1

        return recs

fca_solver = FCAEngine()
