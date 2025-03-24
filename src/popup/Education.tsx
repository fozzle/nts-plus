export default function Education({ onAuth }: { onAuth: () => void }) {
    return (
        <>
            <h3>Show NTS Status on Discord</h3>
            <p>
                You can show others what you're listening to on Discord using
                NTS Plus. Press the "Link Discord" to get started.
            </p>
            <button onClick={onAuth}>Link Discord</button>
        </>
    );
}
