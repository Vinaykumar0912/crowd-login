"""
Unit & Algorithmic Tests for IEEE Access 2025 Base-Paper Components:
- Task 1: Fuzzy Formal Concept Analysis (Kc, Ka, Membership Functions)
- Task 2: Mathematically Valid Concept Lattice Generation (Galois Closure, Covering Relation)
- Task 3: Algorithm 1 — Extraction of Crowded Areas (Threshold T = 0.70)
- Task 4: Algorithm 2 — Crowd-Prevention Plan Generation (Covering, Capacity, Safety)
"""

import unittest
from app.ai.fca_engine import FCAEngine, fca_solver, CROWD_ATTRIBUTES

class TestFCAEngineResearch(unittest.TestCase):
    def setUp(self):
        self.engine = FCAEngine()

    # =========================================================================
    # TASK 1: FUZZY FCA & MEMBERSHIP FUNCTIONS (Paper Definitions 4 & 5)
    # =========================================================================

    def test_fuzzy_crowd_context_creation(self):
        """Verify Crowd Fuzzy Context Kc = (A, F, R) generation with D, P, M, E, S attributes in [0, 1]."""
        zones = [
            {"id": "z1", "name": "Zone A — Main Gate", "density": 85.0, "current_count": 850, "capacity": 1000, "zone_type": "gate_area"},
            {"id": "z2", "name": "Zone B — Concourse", "density": 30.0, "current_count": 300, "capacity": 1000, "zone_type": "general"},
            {"id": "z3", "name": "Zone C — Backstage", "density": 10.0, "current_count": 50, "capacity": 500, "zone_type": "restricted"}
        ]
        cameras = [
            {"id": "c1", "location": "Zone A — Main Gate", "density": 85.0, "flow_rate": 3.6, "speed_avg": 0.3},
            {"id": "c2", "location": "Zone B — Concourse", "density": 30.0, "flow_rate": 0.8, "speed_avg": 1.3}
        ]
        alerts = [
            {"zone": "Zone A — Main Gate", "title": "Critical bottleneck surge", "level": "critical", "resolved": False}
        ]

        objects, Kc = self.engine.build_fuzzy_crowd_context(zones, cameras, alerts)

        self.assertEqual(len(objects), 3)
        self.assertIn("Zone A — Main Gate", Kc)
        self.assertIn("Zone B — Concourse", Kc)
        self.assertIn("Zone C — Backstage", Kc)

        # Check Zone A (Overcrowded gate with critical alert and slow crawl speed)
        za = Kc["Zone A — Main Gate"]
        self.assertGreaterEqual(za["D"], 0.80, "Zone A density should be >= 0.80")
        self.assertGreaterEqual(za["M"], 0.70, "Zone A movement flow should be elevated")
        self.assertEqual(za["E"], 1.0, "Zone A emergency factor should be 1.0 from critical alert")
        self.assertGreaterEqual(za["S"], 0.50, "Zone A speed stagnation anomaly should be elevated")

        # Check Zone B (Low crowd, normal walking speed)
        zb = Kc["Zone B — Concourse"]
        self.assertLess(zb["D"], 0.50, "Zone B density should be < 0.50")
        self.assertLess(zb["E"], 0.50, "Zone B emergency should be low")
        self.assertLess(zb["S"], 0.40, "Zone B speed anomaly should be low")

        # Verify all fuzzy values are bounded strictly within [0.0, 1.0]
        for obj, scores in Kc.items():
            for attr in ["D", "P", "M", "E", "S"]:
                self.assertTrue(0.0 <= scores[attr] <= 1.0, f"Attribute {attr} for {obj} must be in [0, 1]")

    def test_area_context_and_blocked_corridors(self):
        """Verify Area Formal Context Ka = (A, A, R) and exclusion of blocked physical passages."""
        zones = [
            {"id": "z1", "name": "Concourse North"},
            {"id": "z2", "name": "Central Hall"},
            {"id": "z3", "name": "South Exit"}
        ]
        connections = [
            {"from_zone_id": "z1", "to_zone_id": "z2", "bidirectional": True, "is_blocked": False},
            {"from_zone_id": "z2", "to_zone_id": "z3", "bidirectional": True, "is_blocked": True}  # Blocked exit corridor
        ]

        objects, Ka = self.engine.build_area_context(zones, connections)

        self.assertEqual(len(objects), 3)
        # Unblocked connection z1 <-> z2
        self.assertIn("Central Hall", Ka["Concourse North"])
        self.assertIn("Concourse North", Ka["Central Hall"])
        # Blocked corridor z2 <-> z3 must NOT be present in Ka relation
        self.assertNotIn("South Exit", Ka["Central Hall"], "Blocked passage must be excluded from Ka")
        self.assertNotIn("Central Hall", Ka["South Exit"], "Blocked passage must be excluded from Ka")

    def test_empty_and_boundary_contexts(self):
        """Verify graceful handling of empty contexts, single zones, and boundary zero inputs."""
        objects, Kc = self.engine.build_fuzzy_crowd_context([])
        self.assertTrue(len(objects) > 0, "Empty zones should fall back gracefully")
        for obj, scores in Kc.items():
            for v in scores.values():
                self.assertEqual(v, 0.0)

        # Single zone
        objects, Kc = self.engine.build_fuzzy_crowd_context([{"id": "z0", "name": "Solo Zone", "density": 0.0}])
        self.assertEqual(objects, ["Solo Zone"])
        self.assertEqual(Kc["Solo Zone"]["D"], 0.0)

    # =========================================================================
    # TASK 2: CONCEPT LATTICE GENERATION & GALOIS CLOSURE OPERATORS
    # =========================================================================

    def test_galois_closure_and_uniqueness(self):
        """
        Verify Galois derivation operators:
        Extent' = Intent and Intent' = Extent.
        Check that every derived concept is mathematically closed and unique.
        """
        objects = ["A1", "A2", "A3", "A4"]
        # Formal context incidence:
        # A1 has {D, M}
        # A2 has {D, M, P}
        # A3 has {P, S}
        # A4 has {D, M, P, S}
        relation = {
            "A1": {"D", "M"},
            "A2": {"D", "M", "P"},
            "A3": {"P", "S"},
            "A4": {"D", "M", "P", "S"}
        }
        all_attrs = ["D", "M", "P", "S"]

        concepts = self.engine.derive_closed_concepts(objects, relation, all_attrs)
        self.assertTrue(len(concepts) >= 4, "Should discover closed concepts")

        # Verify each concept satisfies Galois closure: Extent' = Intent and Intent' = Extent
        seen_pairs = set()
        for c in concepts:
            ext = c["extent"]
            intt = set(c["intent"])

            # Verify Extent' = Intent
            derived_intent = self.engine.galois_intent(ext, all_attrs, relation)
            self.assertEqual(derived_intent, intt, f"Galois closure failed: Extent' {derived_intent} != Intent {intt}")

            # Verify Intent' = Extent
            derived_extent = sorted(self.engine.galois_extent(intt, objects, relation))
            self.assertEqual(derived_extent, sorted(ext), f"Galois closure failed: Intent' {derived_extent} != Extent {ext}")

            # Verify uniqueness
            pair = (tuple(sorted(ext)), tuple(sorted(list(intt))))
            self.assertNotIn(pair, seen_pairs, "Duplicate formal concept generated")
            seen_pairs.add(pair)

    def test_lattice_covering_relation_and_acyclicity(self):
        """
        Verify that Hasse diagram edges represent strict immediate covering relationships
        without skipped transitive jumps or duplicate edges.
        """
        objects = ["A1", "A2", "A3"]
        relation = {
            "A1": {"D"},
            "A2": {"D", "M"},
            "A3": {"D", "M", "P"}
        }
        all_attrs = ["D", "M", "P"]

        concepts = self.engine.derive_closed_concepts(objects, relation, all_attrs)
        nodes, connections = self.engine.build_lattice_graph(concepts)

        self.assertEqual(len(nodes), len(concepts))
        
        # In a linear chain {D} -> {D, M} -> {D, M, P},
        # there should be covering edges between immediate levels,
        # but NO shortcut edge directly from {D} to {D, M, P} (transitive reduction)
        concept_by_intent_len = {len(c["intent"]): c["id"] for c in concepts}
        if 1 in concept_by_intent_len and 2 in concept_by_intent_len and 3 in concept_by_intent_len:
            id_1 = concept_by_intent_len[1]
            id_2 = concept_by_intent_len[2]
            id_3 = concept_by_intent_len[3]

            # Immediate covering edges should exist
            has_1_to_2 = any(conn["from"] == id_1 and conn["to"] == id_2 for conn in connections)
            has_2_to_3 = any(conn["from"] == id_2 and conn["to"] == id_3 for conn in connections)
            self.assertTrue(has_1_to_2, "Direct cover c1 -> c2 must exist")
            self.assertTrue(has_2_to_3, "Direct cover c2 -> c3 must exist")

            # Shortcut edge must NOT exist
            has_shortcut = any(conn["from"] == id_1 and conn["to"] == id_3 for conn in connections)
            self.assertFalse(has_shortcut, "Transitive jump c1 -> c3 must be removed by transitive reduction")

    # =========================================================================
    # TASK 3: ALGORITHM 1 — EXTRACTION OF CROWDED AREAS
    # =========================================================================

    def test_algorithm_1_crowded_areas_extraction(self):
        """
        Verify Algorithm 1 (IEEE Access 2025, p. 11):
        - Traverses Lc in decreasing size of Intent
        - Filters out low-crowd areas where c <= T (T=0.7)
        - Accurately classifies high-crowd areas
        """
        # Concept hierarchy:
        # c1: Intent={D, M, P, S}, Extent=[A1]
        # c2: Intent={D, M}, Extent=[A1, A2]
        # c3: Intent={}, Extent=[A1, A2, A3, A4] (Supremum)
        Lc = [
            {"id": "c1", "intent": ["D", "M", "P", "S"], "extent": ["A1"]},
            {"id": "c2", "intent": ["D", "M"], "extent": ["A1", "A2"]},
            {"id": "c3", "intent": [], "extent": ["A1", "A2", "A3", "A4"]}
        ]

        Kc = {
            # A1: High crowd across all criteria (c > 0.70)
            "A1": {"D": 0.95, "P": 0.85, "M": 0.90, "E": 0.90, "S": 0.80},
            # A2: Borderline density, low overall (c ~ 0.55 <= 0.70)
            "A2": {"D": 0.55, "P": 0.30, "M": 0.50, "E": 0.10, "S": 0.20},
            # A3 & A4: Clear low crowd (c < 0.30)
            "A3": {"D": 0.20, "P": 0.10, "M": 0.15, "E": 0.00, "S": 0.10},
            "A4": {"D": 0.10, "P": 0.10, "M": 0.05, "E": 0.00, "S": 0.05}
        }

        CA = self.engine.extract_crowded_areas(Lc, Kc, threshold=0.70)

        # Only A1 satisfies c > 0.70; A2, A3, A4 must be dismissed
        ca_names = [item["area"] for item in CA]
        self.assertIn("A1", ca_names, "A1 must be extracted as high-crowd area")
        self.assertNotIn("A2", ca_names, "A2 (c <= 0.70) must be dismissed as low-crowd")
        self.assertNotIn("A3", ca_names, "A3 (c <= 0.70) must be dismissed as low-crowd")
        self.assertNotIn("A4", ca_names, "A4 (c <= 0.70) must be dismissed as low-crowd")

        # Verify structured output fields
        a1_result = next(item for item in CA if item["area"] == "A1")
        self.assertGreater(a1_result["crowd_score"], 0.70)
        self.assertEqual(a1_result["concept_id"], "c1", "A1 must match concept with highest intent first")
        self.assertIn("D", a1_result["satisfied_intent"])

    # =========================================================================
    # TASK 4: ALGORITHM 2 — CROWD-PREVENTION PLAN GENERATION
    # =========================================================================

    def test_algorithm_2_plan_generation_and_safety(self):
        """
        Verify Algorithm 2 (IEEE Access 2025, p. 12):
        - Traverses La in decreasing size of Extent
        - Verifies cover(A', cpt.Intent) ensuring non-crowded destinations with capacity
        - Rejects candidate destinations that are also crowded or blocked
        - Flags status='pending_human_approval' (strict safety requirement)
        """
        # La concepts:
        # c1: Extent=[Area1, Area2, Area3], Intent=[Area4] (Area 4 connects to 1, 2, 3)
        # c2: Extent=[Area1, Area2], Intent=[Area3]
        La = [
            {"id": "c1", "extent": ["Area1", "Area2", "Area3"], "intent": ["Area4"]},
            {"id": "c2", "extent": ["Area1", "Area2"], "intent": ["Area3"]}
        ]

        # Area1 is crowded (from Algorithm 1)
        CA = [
            {"area": "Area1", "crowd_score": 0.88, "concept_id": "c_high", "satisfied_intent": ["D", "M"]}
        ]

        zone_states = {
            "Area1": {"capacity": 1000, "density": 88.0, "current_count": 880},
            "Area2": {"capacity": 800, "density": 40.0, "current_count": 320},
            "Area3": {"capacity": 600, "density": 25.0, "current_count": 150},
            "Area4": {"capacity": 1500, "density": 20.0, "current_count": 300}
        }

        # Scenario A: Unblocked route to Area 4
        result = self.engine.generate_crowd_prevention_plan(La, CA, zone_states=zone_states)

        self.assertEqual(result["total_crowded_areas"], 1)
        self.assertEqual(result["resolved_count"], 1)
        self.assertEqual(len(result["plans"]), 1)

        plan = result["plans"][0]
        self.assertIn("Area1", plan["crowded_sources"])
        self.assertIn("Area4", plan["recommended_destinations"])
        self.assertEqual(plan["status"], "pending_human_approval", "Plans must require human operator approval")
        self.assertFalse(plan["is_verified_evacuation"], "Must be candidate prevention plan, not emergency evacuation")

        # Scenario B: Corridor to Area 4 is BLOCKED
        blocked_edges = {("Area1", "Area4"), ("Area4", "Area1")}
        result_blocked = self.engine.generate_crowd_prevention_plan(
            La, CA, zone_states=zone_states, blocked_edges=blocked_edges
        )

        # Plan should reject Area 4 and fall back to c2 (Area 3) or report limitation
        plan_blocked = result_blocked["plans"][0]
        self.assertNotIn("Area4", plan_blocked["recommended_destinations"], "Blocked corridor must be rejected")
        self.assertIn("Area3", plan_blocked["recommended_destinations"])

        # Scenario C: All destinations overcrowded (>75% density)
        overcrowded_states = {
            "Area1": {"capacity": 1000, "density": 88.0},
            "Area3": {"capacity": 600, "density": 85.0},
            "Area4": {"capacity": 1500, "density": 90.0}
        }
        result_no_route = self.engine.generate_crowd_prevention_plan(
            La, CA, zone_states=overcrowded_states
        )
        self.assertEqual(len(result_no_route["plans"]), 0, "Cannot propose destinations that are already overcrowded")
        self.assertIn("Area1", result_no_route["unresolved_areas"], "Must report unresolved area when no safe plan exists")

if __name__ == "__main__":
    unittest.main()
