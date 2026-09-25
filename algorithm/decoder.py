import numpy as np


def sigmoid(x):
    return 1.0 / (
        1.0 + np.exp(-np.clip(x, -60, 60))
    )


def decode_particle(particle, destinations, n_vehicles):

    n = len(destinations)

    # Map continuous particle position to valid key range.
    keys = sigmoid(particle)

    # --------------------------------------------------------
    # Destination ordering
    # --------------------------------------------------------

    order_keys = keys[:n]

    sorted_indices = np.argsort(order_keys)

    ordered_destinations = [
        destinations[i]
        for i in sorted_indices
    ]

    # --------------------------------------------------------
    # Vehicle route split
    # --------------------------------------------------------

    split_keys = keys[n:]

    sorted_split_keys = np.sort(split_keys)

    n_splits = n_vehicles - 1

    span = n - n_vehicles + 1

    base_positions = np.arange(
        1,
        n_splits + 1
    )

    split_positions = (
        np.floor(
            sorted_split_keys * span
        ).astype(int)
        + base_positions
    )

    routes = []

    start = 0

    for split in split_positions:

        routes.append(
            ordered_destinations[start:split]
        )

        start = split

    routes.append(
        ordered_destinations[start:]
    )

    return routes