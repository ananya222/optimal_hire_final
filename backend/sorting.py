

def quicksort_matches(matches, key="score", tiebreak_key="years_experience", low=0, high=None):
    if high is None:
        high = len(matches) - 1

    if low < high:
        pivot_index = partition(matches, key, tiebreak_key, low, high)
        quicksort_matches(matches, key, tiebreak_key, low, pivot_index - 1)
        quicksort_matches(matches, key, tiebreak_key, pivot_index + 1, high)

    return matches


def is_greater(a, b, key, tiebreak_key):

    if a[key] != b[key]:
        return a[key] > b[key]
    return a.get(tiebreak_key, 0) > b.get(tiebreak_key, 0)


def partition(matches, key, tiebreak_key, low, high, j=None, i=None):
    if j is None:
        j = low
    if i is None:
        i = low - 1

    if j == high:
        matches[i + 1], matches[high] = matches[high], matches[i + 1]
        return i + 1

    pivot = matches[high]

    if is_greater(matches[j], pivot, key, tiebreak_key):
        i += 1
        matches[i], matches[j] = matches[j], matches[i]

    return partition(matches, key, tiebreak_key, low, high, j + 1, i)