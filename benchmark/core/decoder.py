"""
Solution decoders for converting algorithm representations to VRP solutions.

Provides decoders for:
- SPV (Smallest Position Value) for continuous particle positions
- Direct permutation for GA
- Pheromone-based construction for ACO
"""

from typing import List
import numpy as np
from .problem import VRPInstance
from .solution import VRPSolution, Route


def spv_decoder(continuous_position: np.ndarray) -> List[int]:
    """
    Smallest Position Value (SPV) decoder.
    
    Converts continuous particle position to discrete permutation.
    
    Args:
        continuous_position: Continuous vector of dimension n
    
    Returns:
        Customer permutation (1-indexed)
    """
    n = len(continuous_position)
    
    # Create pairs of (index, value)
    indexed_values = [(i, continuous_position[i]) for i in range(n)]
    
    # Sort by value to get permutation
    indexed_values.sort(key=lambda x: x[1])
    
    # Extract permutation (1-indexed for customers)
    permutation = [idx + 1 for idx, _ in indexed_values]
    
    return permutation


def route_decoder(
    permutation: List[int],
    instance: VRPInstance,
    use_capacity_constraints: bool = True
) -> VRPSolution:
    """
    Decode a customer permutation into vehicle routes.
    
    Args:
        permutation: Customer permutation (1-indexed)
        instance: VRP problem instance
        use_capacity_constraints: Whether to respect capacity constraints
    
    Returns:
        VRP solution with routes
    """
    num_vehicles = instance.num_vehicles
    capacity = instance.vehicles[0].capacity  # Assume uniform capacity
    demands = [c.demand for c in instance.customers]
    
    if use_capacity_constraints:
        routes = permutation_to_routes_with_capacity(
            permutation, num_vehicles, capacity, demands
        )
    else:
        routes = permutation_to_routes_simple(
            permutation, num_vehicles
        )
    
    # Convert to Route objects
    route_objects = []
    for v, route_nodes in enumerate(routes):
        route_demand = sum(demands[node-1] for node in route_nodes if node != 0)
        route_objects.append(Route(
            vehicle_id=v,
            nodes=route_nodes,
            demand=route_demand
        ))
    
    return VRPSolution(routes=route_objects)


def permutation_to_routes_simple(
    permutation: List[int],
    num_vehicles: int
) -> List[List[int]]:
    """
    Simple equal split decoder (ignores capacity).
    
    Args:
        permutation: Customer permutation
        num_vehicles: Number of vehicles
    
    Returns:
        List of routes (each route starts/ends with depot)
    """
    n = len(permutation)
    customers_per_vehicle = max(1, n // num_vehicles)
    
    routes = []
    for v in range(num_vehicles):
        start_idx = v * customers_per_vehicle
        end_idx = min((v + 1) * customers_per_vehicle, n)
        
        vehicle_customers = permutation[start_idx:end_idx]
        routes.append([0] + vehicle_customers + [0])
    
    return routes


def permutation_to_routes_with_capacity(
    permutation: List[int],
    num_vehicles: int,
    capacity: float,
    demands: List[float]
) -> List[List[int]]:
    """
    Capacity-constrained decoder using first-fit heuristic.
    
    Args:
        permutation: Customer permutation (1-indexed)
        num_vehicles: Number of vehicles
        capacity: Vehicle capacity
        demands: Customer demands
    
    Returns:
        List of routes (each route starts/ends with depot)
    """
    routes = [[] for _ in range(num_vehicles)]
    route_demands = [0.0] * num_vehicles
    
    for customer_id in permutation:
        customer_demand = demands[customer_id - 1]
        assigned = False
        
        # First-fit: assign to first vehicle with sufficient capacity
        for v in range(num_vehicles):
            if route_demands[v] + customer_demand <= capacity:
                routes[v].append(customer_id)
                route_demands[v] += customer_demand
                assigned = True
                break
        
        # If no vehicle has capacity, assign to first vehicle (creates infeasible solution)
        if not assigned:
            routes[0].append(customer_id)
            route_demands[0] += customer_demand
    
    # Add depot to start and end of each route
    complete_routes = []
    for v in range(num_vehicles):
        if routes[v]:
            complete_routes.append([0] + routes[v] + [0])
        else:
            complete_routes.append([0, 0])  # Empty route
    
    return complete_routes


def pheromone_decoder(
    pheromone_matrix: np.ndarray,
    instance: VRPInstance,
    alpha: float = 1.0,
    beta: float = 2.0
) -> List[int]:
    """
    Pheromone-based decoder for ACO.
    
    Constructs a customer permutation based on pheromone trails and heuristic information.
    
    Args:
        pheromone_matrix: Pheromone matrix (n+1 x n+1, including depot)
        instance: VRP problem instance
        alpha: Pheromone importance weight
        beta: Heuristic importance weight
    
    Returns:
        Customer permutation (1-indexed)
    """
    n_customers = instance.num_customers
    unvisited = set(range(1, n_customers + 1))
    permutation = []
    current_node = 0  # Start from depot
    
    while unvisited:
        # Calculate probabilities for next customer
        probabilities = []
        candidates = []
        
        for next_node in unvisited:
            # Pheromone factor
            pheromone = pheromone_matrix[current_node, next_node] ** alpha
            
            # Heuristic factor (inverse of distance)
            distance = instance.get_distance(current_node, next_node)
            heuristic = (1.0 / distance) ** beta if distance > 0 else 0
            
            probability = pheromone * heuristic
            probabilities.append(probability)
            candidates.append(next_node)
        
        # Normalize probabilities
        total_prob = sum(probabilities)
        if total_prob > 0:
            probabilities = [p / total_prob for p in probabilities]
        else:
            # Uniform random if all probabilities are zero
            probabilities = [1.0 / len(candidates)] * len(candidates)
        
        # Select next customer using roulette wheel
        next_customer = np.random.choice(candidates, p=probabilities)
        
        permutation.append(next_customer)
        unvisited.remove(next_customer)
        current_node = next_customer
    
    return permutation