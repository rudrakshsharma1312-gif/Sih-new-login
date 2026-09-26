"""
Tests for shared fitness evaluation function.

Ensures all algorithms use the same evaluation criteria.
"""

import sys
from pathlib import Path
import numpy as np

sys.path.insert(0, str(Path(__file__).parent.parent))

from core.problem import VRPInstance, create_vrp_from_coordinates
from core.solution import VRPSolution, Route
from core.fitness import evaluate_solution, FitnessEvaluator


def test_fitness_consistency():
    """Test that fitness calculation is consistent across calls."""
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
    
    # Create simple solution
    route1 = Route(vehicle_id=0, nodes=[0, 1, 2, 0], demand=13.0)
    route2 = Route(vehicle_id=1, nodes=[0, 3, 0], demand=6.0)
    solution = VRPSolution(routes=[route1, route2])
    
    # Evaluate twice
    result1 = evaluate_solution(solution, instance)
    result2 = evaluate_solution(solution, instance)
    
    # Check consistency
    assert result1['fitness'] == result2['fitness'], "Fitness should be consistent"
    assert result1['distance'] == result2['distance'], "Distance should be consistent"
    assert result1['travel_time'] == result2['travel_time'], "Travel time should be consistent"
    
    print("✓ TEST 5: Fitness calculation is consistent across calls")


def test_fitness_normalization():
    """Test that fitness normalization works correctly."""
    # Create instance
    depot_coords = (50.0, 50.0)
    customer_coords = [(20.0, 30.0), (80.0, 70.0)]
    demands = [5.0, 8.0]
    
    instance = create_vrp_from_coordinates(
        depot_coords=depot_coords,
        customer_coords=customer_coords,
        demands=demands,
        num_vehicles=1,
        vehicle_capacity=20,
        seed=42
    )
    
    evaluator = FitnessEvaluator(instance)
    
    # Test normalization bounds are reasonable
    assert evaluator.bounds['distance']['min'] > 0, "Min distance should be positive"
    assert evaluator.bounds['distance']['max'] > evaluator.bounds['distance']['min'], "Max should be > min"
    
    # Test normalization produces values in [0,1]
    test_value = (evaluator.bounds['distance']['min'] + evaluator.bounds['distance']['max']) / 2
    normalized = evaluator.normalize(test_value, 'distance')
    assert 0 <= normalized <= 1, f"Normalized value {normalized} should be in [0,1]"
    
    print("✓ TEST 5: Fitness normalization works correctly")


def test_constraint_penalty():
    """Test that constraint violations are properly penalized."""
    # Create instance
    depot_coords = (50.0, 50.0)
    customer_coords = [(20.0, 30.0), (80.0, 70.0), (40.0, 60.0)]
    demands = [5.0, 8.0, 6.0]
    
    instance = create_vrp_from_coordinates(
        depot_coords=depot_coords,
        customer_coords=customer_coords,
        demands=demands,
        num_vehicles=2,
        vehicle_capacity=10,  # Low capacity to force violations
        seed=42
    )
    
    # Create infeasible solution (capacity violation)
    route1 = Route(vehicle_id=0, nodes=[0, 1, 2, 0], demand=13.0)  # Exceeds capacity
    route2 = Route(vehicle_id=1, nodes=[0, 3, 0], demand=6.0)
    solution = VRPSolution(routes=[route1, route2])
    
    result = evaluate_solution(solution, instance)
    
    # Should have constraint penalty
    assert result['constraint_penalty'] > 0, "Infeasible solution should have penalty"
    assert not result['feasible'], "Solution should be marked infeasible"
    
    print("✓ TEST 5: Constraint penalty works correctly")


def run_all_fitness_tests():
    """Run all fitness-related tests."""
    print("Running fitness evaluation tests...")
    print("-" * 60)
    
    test_fitness_consistency()
    test_fitness_normalization()
    test_constraint_penalty()
    
    print("-" * 60)
    print("All fitness tests passed!")


if __name__ == "__main__":
    run_all_fitness_tests()