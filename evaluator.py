import networkx as nx


def evaluate_route(route, G, depot):
    """
    Evaluate one vehicle route.

    Vehicle travels:
    depot -> destination 1 -> destination 2 -> ... -> depot

    Returns:
        distance
        travel_time
        congestion
        emissions
    """

    if len(route) == 0:
        return {
            "distance": 0.0,
            "travel_time": 0.0,
            "congestion": 0.0,
            "emissions": 0.0
        }

    full_route = [depot] + route + [depot]

    total_distance = 0.0
    total_time = 0.0
    total_congestion = 0.0
    total_emissions = 0.0

    for i in range(len(full_route) - 1):

        source = full_route[i]
        target = full_route[i + 1]

        # Shortest road path between two consecutive destinations
        path = nx.shortest_path(
            G,
            source=source,
            target=target,
            weight="effective_weight"
        )

        # Evaluate every edge in that road path
        for u, v in zip(path[:-1], path[1:]):

            edge_data = G.get_edge_data(u, v)

            # MultiGraph can have multiple edges between u and v.
            # Select the edge with minimum effective weight.
            best_edge = min(
                edge_data.values(),
                key=lambda x: x["effective_weight"]
            )

            distance = best_edge["length"]
            travel_time = best_edge["travel_time"]
            traffic_factor = best_edge["traffic_factor"]

            total_distance += distance
            total_time += travel_time

            # Congestion contribution
            total_congestion += traffic_factor

            # PRD emission proxy:
            # edge_distance × vehicle_weight_factor
            #
            # The current dataset does not provide
            # vehicle_weight_factor, so for this test
            # we use 1.0 as an implementation placeholder.
            vehicle_weight_factor = 1.0

            total_emissions += (
                distance * vehicle_weight_factor
            )

    return {
        "distance": total_distance,
        "travel_time": total_time,
        "congestion": total_congestion,
        "emissions": total_emissions
    }