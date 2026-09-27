import numpy as np


def qpso_update(
    positions,
    pbest_positions,
    gbest_position,
    mbest,
    beta
):
    """
    Perform one QPSO position update.
    """

    phi = np.random.rand(*positions.shape)

    # Local attractor
    p = (
        phi * pbest_positions
        + (1.0 - phi) * gbest_position
    )

    # Random value for logarithmic term
    u = np.random.rand(*positions.shape)

    # Prevent log(0)
    u = np.clip(u, 1e-12, 1.0)

    # Random direction: -1 or +1
    direction = np.where(
        np.random.rand(*positions.shape) < 0.5,
        -1.0,
        1.0
    )

    # QPSO position update
    new_positions = (
        p
        + direction
        * beta
        * np.abs(mbest - positions)
        * np.log(1.0 / u)
    )

    return new_positions


def calculate_mbest(pbest_positions):
    """
    Calculate MBEST.

    MBEST is the mean of all particles'
    personal-best positions.
    """

    return np.mean(pbest_positions, axis=0)


def run_qpso(
    objective_function,
    n_particles=25,
    n_iterations=200,
    dimensions=12,
    beta_max=1.0,
    beta_min=0.5,
    seed=None
):
    """
    Run the QPSO optimizer.
    """

    if seed is not None:
        np.random.seed(seed)

    # Initial particle positions
    positions = np.random.rand(
        n_particles,
        dimensions
    )

    # Initial fitness
    fitness = np.array([
        objective_function(position)
        for position in positions
    ])

    # Personal bests
    pbest_positions = positions.copy()
    pbest_fitness = fitness.copy()

    # Global best
    best_index = np.argmin(pbest_fitness)

    gbest_position = (
        pbest_positions[best_index].copy()
    )

    gbest_fitness = float(
        pbest_fitness[best_index]
    )

    convergence_history = [
        gbest_fitness
    ]

    # Optimization loop
    for iteration in range(n_iterations):

        # Linear beta schedule
        if n_iterations > 1:
            beta = (
                beta_max
                - (beta_max - beta_min)
                * iteration
                / (n_iterations - 1)
            )
        else:
            beta = beta_min

        # MBEST
        mbest = calculate_mbest(
            pbest_positions
        )

        # QPSO update
        positions = qpso_update(
            positions=positions,
            pbest_positions=pbest_positions,
            gbest_position=gbest_position,
            mbest=mbest,
            beta=beta
        )

        # Evaluate new positions
        fitness = np.array([
            objective_function(position)
            for position in positions
        ])

        # Update personal bests
        improved = fitness < pbest_fitness

        pbest_positions[improved] = (
            positions[improved]
        )

        pbest_fitness[improved] = (
            fitness[improved]
        )

        # Update global best
        best_index = np.argmin(
            pbest_fitness
        )

        if pbest_fitness[best_index] < gbest_fitness:

            gbest_fitness = float(
                pbest_fitness[best_index]
            )

            gbest_position = (
                pbest_positions[best_index].copy()
            )

        convergence_history.append(
            gbest_fitness
        )

    return {
        "best_position": gbest_position,
        "best_fitness": gbest_fitness,
        "convergence": convergence_history
    }