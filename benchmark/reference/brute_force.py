"""
Brute force solver for small VRP instances.

Used for reference solutions on tiny datasets (toy_10) to calculate optimality gaps.
"""

import itertools
import numpy as np
from typing import Dict, List, Tuple, Optional

from ..core.problem import VRPInstance
from ..core.solution import VRPSolution, Route
from ..core.fitness import evaluate_solution


def brute_force_vrp(instance: VRPInstance, max_permutations: int = 100000) -> Dict:
    """
    Solve VRP using brute force enumeration.
    
    Only practical for very small instances (<= 10 customers).
    
    Args:
        instance: VRP problem instance
        max_permutations: Maximum permutations to enumerate (safety limit)
    
    Returns:
        Dictionary containing best solution and statistics
    """
    n_customers = instance.num_customers
    n_vehicles = instance.num_vehicles
    
    if n_customers > 10:
        raise ValueError(f"Brute force only practical for <= 10 customers, got {n_customers}")
    
    print(f"Brute force solving VRP with {n_customers} customers and {n_vehicles} vehicles...")
    print(f"Total permutations: {np.math.factorial(n_customers)}")
    
    # Generate all customer permutations
    customers = list(range(1, n_customers + 1))
    permutations = list(itertools.permutations(customers))
    
    # Safety limit
    if len(permutations) > max_permutations:
        print(f"Limiting to {max_permutations} permutations")
        permutations = permutations[:max_permutations]
    
    best_fitness = float('inf')
    best_solution = None
    best_permutation = None
    evaluated = 0
    
    for permutation in permutations:
        evaluated += 1
        
        # Decode permutation to routes (simple split)
        routes = _permutation_to_routes_simple(list(permutation), n_vehicles)
        
        # Create solution
        route_objects = []
        for v, route_nodes in enumerate(routes):
            route_demand = sum(instance.get_customer_demand(node) for node in route_nodes if node != 0)
            route_objects.append(Route(vehicle_id=v, nodes=route_nodes, demand=route_demand))
        
        solution = VRPSolution(routes=route_objects)
        
        # Evaluate
        result = evaluate_solution(solution, instance)
        fitness = result['fitness']
        
        # Track best
        if fitness < best_fitness:
            best_fitness = fitness
            best_solution = solution
            best_permutation = permutation
        
        if evaluated % 1000 == 0:
            print(f"Evaluated {evaluated}/{len(permutations)} permutations, best fitness: {best_fitness:.4f}")
    
    print(f"Brute force complete. Evaluated {evaluated} permutations.")
    print(f"Best fitness: {best_fitness:.4f}")
    
    return {
        'best_fitness': best_fitness,
        'best_solution': best_solution,
        'best_permutation': best_permutation,
        'evaluated_permutations': evaluated,
        'total_permutations': len(permutations),
        'result': evaluate_solution(best_solution, instance)
    }


def _permutation_to_routes_simple(permutation: List[int], num_vehicles: int) -> List[List[int]]:
    """Simple equal split of permutation among vehicles."""
    n = len(permutation)
    customers_per_vehicle = max(1, n // num_vehicles)
    
    routes = []
    for v in range(num_vehicles):
        start_idx = v * customers_per_vehicle
        end_idx = min((v + 1) * customers_per_vehicle, n)
        
        vehicle_customers = permutation[start_idx:end_idx]
        routes.append([0] + vehicle_customers + [0])
    
    return routes


def calculate_optimality_gap(algorithm_fitness: float, reference_fitness: float) -> float:
    """
    Calculate optimality gap percentage.
    
    Args:
        algorithm_fitness: Fitness achieved by algorithm
        reference_fitness: Optimal fitness from reference solver
    
    Returns:
        Optimality gap percentage
    """
    if reference_fitness == 0:
        return 0.0
    
    gap = ((algorithm_fitness - reference_fitness) / reference_fitness) * 100
    return gap