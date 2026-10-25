async function loadEvents() {
    console.log("loadEvents running");

    const { data, error } =
        await window.supabaseClient
            .from('events')
            .select('*');

    if (error) {
        console.error(error);
        return;
    }

    // keep busy ratings for events we already had, so a reload doesn't reset them
    const old = new Map(events.map(e => [e.id, e]));

    events.length = 0;
    data
        .filter(row => !hasEnded(row))      // hide events that already ended
        .forEach(row => {
            const prev = old.get(row.id);
            events.push({
                ...row,
                busy: prev?.busy ?? 0.5,
                updatedAt: prev?.updatedAt ?? new Date(),
                pending: prev?.pending ?? []
            });
        });

    sortEvents();
    renderEvents(events);
}

loadEvents();