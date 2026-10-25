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

    // SUPABASE: check-ins from the last 30 minutes decide the busy bar
    const since = new Date(Date.now() - 30 * 60000).toISOString();
    const { data: cks, error: ckError } = await window.supabaseClient
        .from("checkins")
        .select("event_id, busy, created_at")
        .gte("created_at", since);

    if (ckError) console.error(ckError);

    events.forEach(ev => {
        const mine = (cks || []).filter(c => c.event_id === ev.event_id);
        if (mine.length === 0) return;

        ev.busy = mine.reduce((sum, c) => sum + Number(c.busy), 0) / mine.length;
        ev.updatedAt = new Date(Math.max(...mine.map(c => new Date(c.created_at))));
        ev.pending = [];
    });

    sortEvents();
    renderEvents(events);

    if (window.refreshMapEvents) window.refreshMapEvents();
}

loadEvents();