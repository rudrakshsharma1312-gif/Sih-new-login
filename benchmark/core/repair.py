"""
Solution repair mechanisms for handling infeasible VRP solutions.

Provides repair operators to fix constraint violations.
"""

from typing import List
import numpy as np
from .problem import VRPInstance
from .solution import VRPSolution, Route


def repair_solution(solution: VRPSolution, instance: VRPInstance) -> VRPSolution:
    """
    Repair an infeasible VRP solution.
    
    Addresses:
    - Missing customers
    - Duplicate customers
    - Capacity violations
    - Invalid routes
    
    Args:
        solution: Potentially infeasible solution
        instance: VRP problem instance
    
    Returns:
        Repaired (feasible) solution
    """
    # Step 1: Handle missing and duplicate customers
    solution = _repair_customer_coverage(solution, instance)
    
    # Step 2: Handle capacity violations
    solution = _repair_capacity_violations(solution, instance)
    
    # Step 3: Ensure valid route structure
    solution = _repair_route_structure(solution, instance)
    
    return solution


def _repair_customer_coverage(solution: VRPSolution, instance: VRPInstance) -> VRPSolution:
    """
    Repair missing and duplicate customers.
    
    Ensures each customer appears exactly once.
    """
    served_customers = solution.get_served_customers()
    expected_customers = set(range(1, instance.num_customers + 1))
    
    missing_customers = expected_customers - served_customers
    duplicate_customers = _find_duplicate_customers(solution)
    
    # Remove duplicates (keep first occurrence)
    if duplicate_customers:
        for route in solution.routes:
            seen = set()
            cleaned_nodes = []
            for node in route.nodes:
                if node == 0 or node not in seen:
                    cleaned_nodes.append(node)
                    if node != 0:
                        seen.add(node)
            route.nodes = cleaned_nodes
    
    # Add missing customers to least-loaded routes
    if missing_customers:
        # Sort routes by current demand
        routes_by_demand = sorted(solution.routes, key=lambda r: r.demand)
        
        for customer_id in sorted(missing_customers):
            # Add to least-loaded route with capacity
            for route in routes_by_demand:
                customer_demand = instance.get_customer_demand(customer_id)
                vehicle_capacity = instance.get_vehicle_capacity(route.vehicle_id)
                
                if route.demand + customer_demand <= vehicle_capacity:
                    # Insert before final depot
                    route.nodes.insert(-1, customer_id)
                    route.demand += customer_demand
                    break
            else:
                # If no route has capacity, add to first route anyway
                routes_by_demand[0].nodes.insert(-1, customer_id)
                routes_by_demand[0].demand += instance.get_customer_demand(customer_id)
    
    return solution


def _repair_capacity_violations(solution: VRPSolution, instance: VRPInstance) -> VRPSolution:
    """
    Repair capacity violations by moving customers between routes.
    
    Uses a simple heuristic: move customers from overloaded routes to underloaded routes.
    """
    capacity = instance.vehicles[0].capacity  # Assume uniform capacity
    
    # Identify overloaded and underloaded routes
    overloaded = []
    underloaded = []
    
    for route in solution.routes:
        if route.demand > capacity:
            overloaded.append(route)
        elif route.demand < capacity * 0.8:  # Under 80% capacity
            underloaded.append(route)
    
    # Move customers from overloaded to underloaded routes
    for over_route in overloaded:
        while over_route.demand > capacity and underloaded:
            # Find customer to move (prefer later in route)
            for i in range(len(over_route.nodes) - 2, 0, -1):  # Skip depot
                customer_id = over_route.nodes[i]
                if customer_id == 0:
                    continue
                
                customer_demand = instance.get_customer_demand(customer_id)
                
                # Try to move to underloaded route
                for under_route in underloaded:
                    if under_route.demand + customer_demand <= capacity:
                        # Remove from overloaded
                        over_route.nodes.pop(i)
                        over_route.demand -= customer_demand
                        
                        # Add to underloaded (before final depot)
                        under_route.nodes.insert(-1, customer_id)
                        under_route.demand += customer_demand
                        
                        # Update underloaded status
                        if under_route.demand >= capacity * 0.8:
                            underloaded.remove(under_route)
                        
                        break
                else:
                    continue  # No underloaded route can take this customer
                break  # Customer moved, try next
    
    return solution


def _repair_route_structure(solution: VRPSolution, instance: VRPInstance) -> VRPSolution:
    """
    Ensure all routes have valid structure (start and end at depot).
    """
    for route in solution.routes:
        # Ensure route starts with depot
        if not route.nodes or route.nodes[0] != 0:
            route.nodes.insert(0, 0)
        
        # Ensure route ends with depot
        if not route.nodes or route.nodes[-1] != 0:
            route.nodes.append(0)
        
        # Remove consecutive depots
        cleaned_nodes = []
        prev_was_depot = False
        for node in route.nodes:
            if node == 0:
                if not prev_was_depot:
                    cleaned_nodes.append(node)
                    prev_was_depot = True
            else:
                cleaned_nodes.append(node)
                prev_was_depot = False
        
        # Ensure at least depot -> depot for empty routes
        if len(cleaned_nodes) < 2:
            cleaned_nodes = [0, 0]
        
        route.nodes = cleaned_nodes
    
    return solution


def _find_duplicate_customers(solution: VRPSolution) -> set:
    """Find customers that appear multiple times in the solution."""
    customer_count = {}
    
    for route in solution.routes:
        for node in route.nodes:
            if node != 0:
                customer_count[node] = customer_count.get(node, 0) + 1
    
    return {cust for cust, count in customer_count.items() if count > 1}


def two_opt_repair(route: List[int], instance: VRPInstance) -> List[int]:
    """
    Apply 2-opt local search to improve a route.
    
    Args:
        route: Route node sequence
        instance: VRP instance
    
    Returns:
        Improved route
    """
    if len(route) <= 3:  # Need at least depot + 1 customer + depot
        return route
    
    best_route = route[:]
    best_distance = _calculate_route_distance(best_route, instance)
    
    improved = True
    while improved:
        improved = False
        for i in range(1, len(route) - 2):  # Skip depot at start and end
            for j in range(i + 1, len(route) - 1):  # Skip depot at end
                # Try 2-opt swap
                new_route = route[:i] + route[i:j+1][::-1] + route[j+1:]
                new_distance = _calculate_route_distance(new_route, instance)
                
                if new_distance < best_distance:
                    best_route = new_route
                    best_distance = new_distance
                    improved = True
        
        route = best_route
    
    return best_route


def _calculate_route_distance(route: List[int], instance: VRPInstance) -> float:
    """Calculate total distance for a route."""
    total = 0.0
    for i in range(len(route) - 1):
        from_node = route[i]
        to_node = route[i + 1]
        total += instance.get_distance(from_node, to_node)
    return total