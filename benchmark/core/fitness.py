"""
Shared fitness evaluation function for all VRP algorithms.

All algorithms must use this exact same evaluation function to ensure
fair comparison.
"""

from typing import Dict, Tuple
import numpy as np
from .problem import VRPInstance
from .solution import VRPSolution


class FitnessEvaluator:
    """
    Shared fitness evaluator for VRP solutions.
    
    Ensures all algorithms use the exact same evaluation criteria.
    """
    
    def __init__(self, instance: VRPInstance):
        """
        Initialize fitness evaluator with a VRP instance.
        
        Args:
            instance: VRP problem instance
        """
        self.instance = instance
        self._compute_normalization_bounds()
    
    def _compute_normalization_bounds(self):
        """
        Compute normalization bounds for objective functions.
        
        These bounds are used to normalize objectives to [0,1] range.
        """
        # Use distance matrix to estimate bounds
        distances = self.instance.distance_matrix
        travel_times = self.instance.travel_time_matrix
        congestions = self.instance.congestion_matrix
        
        # Estimate bounds based on problem structure
        max_distance = np.sum(distances) / 2  # Rough upper bound
        max_travel_time = np.sum(travel_times) / 2
        max_congestion = np.sum(congestions) / (self.instance.total_nodes * (self.instance.total_nodes - 1))
        max_emissions = max_distance * self.instance.vehicle_weight_factor * self.instance.emissions_per_km
        
        # Minimum bounds (non-zero to avoid division by zero)
        min_distance = np.min(distances[distances > 0]) * self.instance.num_customers
        min_travel_time = np.min(travel_times[travel_times > 0]) * self.instance.num_customers
        min_congestion = self.instance.num_customers  # At least one edge per customer
        min_emissions = min_distance * self.instance.vehicle_weight_factor * self.instance.emissions_per_km
        
        self.bounds = {
            'distance': {'min': min_distance, 'max': max_distance},
            'travel_time': {'min': min_travel_time, 'max': max_travel_time},
            'congestion': {'min': min_congestion, 'max': max_congestion},
            'emissions': {'min': min_emissions, 'max': max_emissions}
        }
    
    def normalize(self, value: float, objective: str) -> float:
        """
        Normalize an objective value to [0,1] range.
        
        Args:
            value: Raw objective value
            objective: Objective name ('distance', 'travel_time', 'congestion', 'emissions')
        
        Returns:
            Normalized value in [0,1]
        """
        bounds = self.bounds[objective]
        min_val = bounds['min']
        max_val = bounds['max']
        
        if max_val == min_val:
            return 0.0
        
        normalized = (value - min_val) / (max_val - min_val)
        return np.clip(normalized, 0.0, 1.0)
    
    def evaluate_solution(self, solution: VRPSolution) -> Dict:
        """
        Evaluate a VRP solution using the shared fitness function.
        
        Args:
            solution: VRP solution to evaluate
        
        Returns:
            Dictionary containing all objective values and fitness
        """
        # Calculate raw objective values
        total_distance = 0.0
        total_travel_time = 0.0
        total_congestion = 0.0
        total_emissions = 0.0
        
        for route in solution.routes:
            # Calculate route metrics
            route_distance = 0.0
            route_time = 0.0
            route_congestion = 0.0
            
            for i in range(len(route.nodes) - 1):
                from_node = route.nodes[i]
                to_node = route.nodes[i + 1]
                
                route_distance += self.instance.get_distance(from_node, to_node)
                route_time += self.instance.get_travel_time(from_node, to_node)
                route_congestion += self.instance.get_congestion(from_node, to_node)
            
            total_distance += route_distance
            total_travel_time += route_time
            total_congestion += route_congestion
            
            # Calculate emissions for this route
            route_emissions = route_distance * self.instance.vehicle_weight_factor * self.instance.emissions_per_km
            total_emissions += route_emissions
        
        # Normalize objectives
        norm_distance = self.normalize(total_distance, 'distance')
        norm_travel_time = self.normalize(total_travel_time, 'travel_time')
        norm_congestion = self.normalize(total_congestion, 'congestion')
        norm_emissions = self.normalize(total_emissions, 'emissions')
        
        # Calculate weighted fitness (MINIMIZATION)
        weights = self.instance
        total_weight = weights.alpha + weights.beta + weights.gamma + weights.delta
        
        fitness = (
            (weights.alpha / total_weight) * norm_travel_time +
            (weights.beta / total_weight) * norm_distance +
            (weights.gamma / total_weight) * norm_congestion +
            (weights.delta / total_weight) * norm_emissions
        ) * 100  # Scale to reasonable range
        
        # Check constraints and add penalties
        constraint_penalty = self._calculate_constraint_penalty(solution)
        fitness += constraint_penalty
        
        # Update solution feasibility
        solution.feasible = (constraint_penalty == 0)
        
        return {
            'fitness': fitness,
            'distance': total_distance,
            'travel_time': total_travel_time,
            'congestion': total_congestion,
            'emissions': total_emissions,
            'norm_distance': norm_distance,
            'norm_travel_time': norm_travel_time,
            'norm_congestion': norm_congestion,
            'norm_emissions': norm_emissions,
            'constraint_penalty': constraint_penalty,
            'feasible': solution.feasible
        }
    
    def _calculate_constraint_penalty(self, solution: VRPSolution) -> float:
        """
        Calculate constraint violation penalty.
        
        Checks:
        - All customers visited exactly once
        - No route exceeds vehicle capacity
        - All routes start and end at depot
        - No invalid graph edges used
        
        Returns:
            Penalty value (0 if feasible, positive if infeasible)
        """
        penalty = 0.0
        violations = []
        
        # Check 1: All customers visited exactly once
        served_customers = solution.get_served_customers()
        expected_customers = set(range(1, self.instance.num_customers + 1))
        
        missing_customers = expected_customers - served_customers
        duplicate_customers = self._find_duplicate_customers(solution)
        
        if missing_customers:
            penalty += len(missing_customers) * self.instance.constraint_penalty
            violations.append(f"Missing customers: {missing_customers}")
        
        if duplicate_customers:
            penalty += len(duplicate_customers) * self.instance.constraint_penalty
            violations.append(f"Duplicate customers: {duplicate_customers}")
        
        # Check 2: No route exceeds vehicle capacity
        for route in solution.routes:
            route_demand = 0.0
            for node in route.nodes:
                if node != 0:  # Not depot
                    route_demand += self.instance.get_customer_demand(node)
            
            vehicle_capacity = self.instance.get_vehicle_capacity(route.vehicle_id)
            if route_demand > vehicle_capacity:
                excess = route_demand - vehicle_capacity
                penalty += excess * self.instance.constraint_penalty * 0.1
                violations.append(f"Vehicle {route.vehicle_id} capacity exceeded by {excess:.2f}")
        
        # Check 3: All routes start and end at depot
        for route in solution.routes:
            if len(route.nodes) < 2:
                violations.append(f"Vehicle {route.vehicle_id} has invalid route length")
                penalty += self.instance.constraint_penalty
            elif route.nodes[0] != 0 or route.nodes[-1] != 0:
                violations.append(f"Vehicle {route.vehicle_id} route doesn't start/end at depot")
                penalty += self.instance.constraint_penalty
        
        # Check 4: No invalid graph edges (all edges should have finite distance)
        for route in solution.routes:
            for i in range(len(route.nodes) - 1):
                from_node = route.nodes[i]
                to_node = route.nodes[i + 1]
                distance = self.instance.get_distance(from_node, to_node)
                
                if distance == 0 and from_node != to_node:
                    violations.append(f"Invalid edge: {from_node} -> {to_node}")
                    penalty += self.instance.constraint_penalty
        
        # Update solution violations
        solution.constraint_violations = violations
        
        return penalty
    
    def _find_duplicate_customers(self, solution: VRPSolution) -> set:
        """Find customers that appear multiple times in the solution."""
        customer_count = {}
        
        for route in solution.routes:
            for node in route.nodes:
                if node != 0:  # Exclude depot
                    customer_count[node] = customer_count.get(node, 0) + 1
        
        duplicates = {cust for cust, count in customer_count.items() if count > 1}
        return duplicates


def evaluate_solution(solution: VRPSolution, instance: VRPInstance) -> Dict:
    """
    Convenience function to evaluate a solution.
    
    This is the main entry point that all algorithms should use.
    
    Args:
        solution: VRP solution to evaluate
        instance: VRP problem instance
    
    Returns:
        Dictionary containing fitness and objective values
    """
    evaluator = FitnessEvaluator(instance)
    return evaluator.evaluate_solution(solution)