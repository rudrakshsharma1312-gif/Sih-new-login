"""
Solution representation for VRP.

Defines the solution structure and route representation.
"""

from dataclasses import dataclass
from typing import List, Tuple
import numpy as np


@dataclass
class Route:
    """Represents a single vehicle route."""
    vehicle_id: int
    nodes: List[int]  # Sequence of node indices (starts and ends at depot)
    demand: float = 0.0  # Total demand served by this route
    
    def __post_init__(self):
        """Calculate route demand after initialization."""
        self.demand = sum(node_demand for node_demand in self.nodes if node_demand > 0)
    
    @property
    def num_stops(self) -> int:
        """Number of customer stops (excluding depot)."""
        return len(self.nodes) - 2  # Exclude start and end depot
    
    def __repr__(self):
        return f"Route(vehicle={self.vehicle_id}, stops={self.num_stops}, demand={self.demand:.1f})"


@dataclass
class VRPSolution:
    """
    Complete VRP solution.
    
    Contains routes for all vehicles and can be evaluated for fitness.
    """
    routes: List[Route]
    feasible: bool = True
    constraint_violations: List[str] = None
    
    def __post_init__(self):
        if self.constraint_violations is None:
            self.constraint_violations = []
    
    @property
    def num_vehicles(self) -> int:
        """Number of vehicles with routes."""
        return len(self.routes)
    
    @property
    def total_distance(self) -> float:
        """Total distance across all routes."""
        return sum(self._calculate_route_distance(route) for route in self.routes)
    
    @property
    def total_travel_time(self) -> float:
        """Total travel time across all routes."""
        return sum(self._calculate_route_travel_time(route) for route in self.routes)
    
    @property
    def total_congestion(self) -> float:
        """Total congestion factor across all routes."""
        return sum(self._calculate_route_congestion(route) for route in self.routes)
    
    @property
    def total_emissions(self) -> float:
        """Total emissions across all routes."""
        return sum(self._calculate_route_emissions(route) for route in self.routes)
    
    def _calculate_route_distance(self, route: Route, distance_matrix: np.ndarray = None) -> float:
        """Calculate total distance for a route."""
        if distance_matrix is None:
            raise ValueError("Distance matrix required for distance calculation")
        
        total = 0.0
        for i in range(len(route.nodes) - 1):
            from_node = route.nodes[i]
            to_node = route.nodes[i + 1]
            total += distance_matrix[from_node, to_node]
        return total
    
    def _calculate_route_travel_time(self, route: Route, travel_time_matrix: np.ndarray = None) -> float:
        """Calculate total travel time for a route."""
        if travel_time_matrix is None:
            raise ValueError("Travel time matrix required for time calculation")
        
        total = 0.0
        for i in range(len(route.nodes) - 1):
            from_node = route.nodes[i]
            to_node = route.nodes[i + 1]
            total += travel_time_matrix[from_node, to_node]
        return total
    
    def _calculate_route_congestion(self, route: Route, congestion_matrix: np.ndarray = None) -> float:
        """Calculate total congestion factor for a route."""
        if congestion_matrix is None:
            raise ValueError("Congestion matrix required for congestion calculation")
        
        total = 0.0
        for i in range(len(route.nodes) - 1):
            from_node = route.nodes[i]
            to_node = route.nodes[i + 1]
            total += congestion_matrix[from_node, to_node]
        return total
    
    def _calculate_route_emissions(self, route: Route, distance_matrix: np.ndarray = None, 
                                  vehicle_weight_factor: float = 1.0, emissions_per_km: float = 0.19) -> float:
        """Calculate total emissions for a route."""
        if distance_matrix is None:
            raise ValueError("Distance matrix required for emissions calculation")
        
        distance = self._calculate_route_distance(route, distance_matrix)
        return distance * vehicle_weight_factor * emissions_per_km
    
    def get_served_customers(self) -> set:
        """Get set of customer IDs served by this solution."""
        served = set()
        for route in self.routes:
            for node in route.nodes:
                if node != 0:  # Exclude depot
                    served.add(node)
        return served
    
    def __repr__(self):
        return f"VRPSolution(vehicles={self.num_vehicles}, feasible={self.feasible})"


def create_solution_from_permutation(
    permutation: List[int],
    num_vehicles: int,
    demands: List[float],
    capacity: float
) -> VRPSolution:
    """
    Create a VRP solution from a customer permutation using simple split.
    
    Args:
        permutation: Customer permutation (1-indexed customer IDs)
        num_vehicles: Number of vehicles
        demands: List of customer demands
        capacity: Vehicle capacity
    
    Returns:
        VRPSolution: Solution with routes divided among vehicles
    """
    # Simple split: divide permutation equally among vehicles
    customers_per_vehicle = max(1, len(permutation) // num_vehicles)
    
    routes = []
    for v in range(num_vehicles):
        start_idx = v * customers_per_vehicle
        end_idx = min((v + 1) * customers_per_vehicle, len(permutation))
        
        vehicle_customers = permutation[start_idx:end_idx]
        
        # Create route: depot -> customers -> depot
        route_nodes = [0] + vehicle_customers + [0]
        
        # Calculate route demand
        route_demand = sum(demands[cust_id - 1] for cust_id in vehicle_customers)
        
        route = Route(
            vehicle_id=v,
            nodes=route_nodes,
            demand=route_demand
        )
        routes.append(route)
    
    return VRPSolution(routes=routes)


def permutation_to_routes(
    permutation: List[int],
    num_vehicles: int,
    capacity: float,
    demands: List[float]
) -> List[List[int]]:
    """
    Convert a customer permutation to vehicle routes with capacity constraints.
    
    Uses a greedy first-fit decoder that respects capacity.
    
    Args:
        permutation: Customer permutation (1-indexed)
        num_vehicles: Number of vehicles
        capacity: Vehicle capacity
        demands: List of customer demands
    
    Returns:
        List of routes (each route is a list of node indices starting/ending with depot)
    """
    routes = [[] for _ in range(num_vehicles)]
    route_demands = [0.0] * num_vehicles
    
    for customer_id in permutation:
        # Find first vehicle with sufficient capacity
        customer_demand = demands[customer_id - 1]
        assigned = False
        
        for v in range(num_vehicles):
            if route_demands[v] + customer_demand <= capacity:
                routes[v].append(customer_id)
                route_demands[v] += customer_demand
                assigned = True
                break
        
        # If no vehicle has capacity, assign to first vehicle (will create infeasible solution)
        if not assigned:
            routes[0].append(customer_id)
            route_demands[0] += customer_demand
    
    # Add depot to start and end of each route
    complete_routes = []
    for v in range(num_vehicles):
        if routes[v]:  # Only add routes that have customers
            complete_routes.append([0] + routes[v] + [0])
        else:
            complete_routes.append([0, 0])  # Empty route: depot -> depot
    
    return complete_routes