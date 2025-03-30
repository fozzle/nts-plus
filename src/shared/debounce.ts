export const debounce = <F extends (...args: Parameters<F>) => ReturnType<F>>(
    func: F,
    waitFor: number,
) => {
    let timeout: number;

    const debounced = (...args: Parameters<F>) => {
        clearTimeout(timeout);
        timeout = window.setTimeout(() => func(...args), waitFor);
    };

    return debounced;
};
