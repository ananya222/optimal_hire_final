import random
import time
from sorting import quicksort_matches


def generate_matches(n):
    return [
        {
            "user_id": i,
            "score": random.random(),
            "years_experience": random.randint(0, 20)
        }
        for i in range(n)
    ]


sizes = [10, 100, 500, 750, 850, 900, 950, 997]
runs = 100

for size in sizes:
    times = []

    for _ in range(runs):
        matches = generate_matches(size)

        start = time.perf_counter()
        quicksort_matches(matches)
        end = time.perf_counter()

        times.append(end - start)

    average = sum(times) / len(times)

    print(
        f"{size} entries: "
        f"{average * 1000:.4f} ms average"
    )