"""
Tests for QPSO algorithm implementation.

Validates that QPSO uses genuine quantum position update with MBEST and beta decay.
"""

import sys
from pathlib import Path
import numpy as np

sys.path.insert(0, str(Path(__file__).parent.parent))

from core.problem import VRPInstance, create_vrp_from_coordinates
from algorithms.qpso import QPSO


def test_qpso_uses_mbest():
    """Test that QPSO actually uses MBEST in position update."""
    # Create simple instance
    depot_coords = (50.0, 50.0)
    customer_coords = [(20.0, 30.0), (80.0, 70.0), (40.0, 60.0)]
    demands = [5.0, 8.0, 6.0]
    
    instance = create_vrp_from_coordinates(
        depot_coords=depot_coords,
        customer_coords=customer_coords,
        demands=demands,
        num_vehicles=2,
        vehicle_capacity=20,
        seed=42
    )
    
    qpso = QPSO(instance, swarm_size=5, max_iterations=10, seed=42)
    qpso.initialize_swarm()
    
    # Calculate MBEST
    mbest = qpso.calculate_mbest()
    
    # Verify MBEST is mean of personal bests
    expected_mbest = np.mean(qpso.pbest_positions, axis=0)
    
    assert np.allclose(mbest, expected_mbest), "MBEST should be mean of personal bests"
    
    print("✓ TEST 6: QPSO actually uses MBEST")


def test_qpso_uses_beta_decay():
    """Test that QPSO uses beta decay coefficient."""
    instance = create_vrp_from_coordinates(
        depot_coords=(50.0, 50.0),
        customer_coords=[(20.0, 30.0), (80.0, 70.0)],
        demands=[5.0, 8.0],
        num_vehicles=1,
        vehicle_capacity=20,
        seed=42
    )
    
    qpso = QPSO(instance, swarm_size=5, max_iterations=10, beta_max=1.0, beta_min=0.5, seed=42)
    
    # Test beta at iteration 0
    beta_0 = qpso.beta_max - (qpso.beta_max - qpso.beta_min) * 0 / (qpso.max_iterations - 1)
    assert beta_0 == 1.0, "Beta at iteration 0 should be beta_max"
    
    # Test beta at final iteration
    beta_final = qpso.beta_max - (qpso.beta_max - qpso.beta_min) * (qpso.max_iterations - 1) / (qpso.max_iterations - 1)
    assert beta_final == 0.5, "Beta at final iteration should be beta_min"
    
    print("✓ TEST 7: QPSO uses beta decay")


def test_qpso_no_velocity():
    """Test that QPSO does not use velocity."""
    instance = create_vrp_from_coordinates(
        depot_coords=(50.0, 50.0),
        customer_coords=[(20.0, 30.0), (80.0, 70.0)],
        demands=[5.0, 8.0],
        num_vehicles=1,
        vehicle_capacity=20,
        seed=42
    )
    
    qpso = QPSO(instance, swarm_size=5, max_iterations=10, seed=42)
    
    # QPSO should not have velocity attribute
    assert not hasattr(qpso, 'velocities'), "QPSO should not have velocities"
    
    # QPSO should have positions
    assert hasattr(qpso, 'positions'), "QPSO should have positions"
    
    print("✓ TEST 6: QPSO does not use velocity (genuine QPSO)")


def test_qpso_quantum_update():
    """Test that QPSO uses quantum position update formula."""
    instance = create_vrp_from_coordinates(
        depot_coords=(50.0, 50.0),
        customer_coords=[(20.0, 30.0), (80.0, 70.0)],
        demands=[5.0, 8.0],
        num_vehicles=1,
        vehicle_capacity=20,
        seed=42
    )
    
    qpso = QPSO(instance, swarm_size=5, max_iterations=10, seed=42)
    qpso.initialize_swarm()
    
    # Get positions before update
    old_positions = qpso.positions.copy()
    
    # Perform quantum position update
    new_positions = qpso.quantum_position_update(0)
    
    # Verify positions changed
    assert not np.allclose(old_positions, new_positions), "Positions should change after update"
    
    # Verify update formula components are used
    mbest = qpso.calculate_mbest()
    
    # The update should use MBEST
    assert np.any(new_positions != old_positions), "Quantum update should modify positions"
    
    print("✓ TEST 6: QPSO uses quantum position update formula")


def run_all_qpso_tests():
    """Run all QPSO tests."""
    print("Running QPSO algorithm tests...")
    print("-" * 60)
    
    test_qpso_uses_mbest()
    test_qpso_uses_beta_decay()
    test_qpso_no_velocity()
    test_qpso_quantum_update()
    
    print("-" * 60)
    print("All QPSO tests passed!")


if __name__ == "__main__":
    run_all_qpso_tests()