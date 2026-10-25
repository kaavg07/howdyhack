async function loadEvents() {
    console.log("loadEvents running");

    const { data, error } =
        await window.supabaseClient
            .from('events')
            .select('*');

    console.log(error);

    data.forEach(row => {
      row.busy = 0.5;
      row.updatedAt = new Date();
      row.pending = [];
    });

    events.length = 0;
    data.forEach(row => events.push(row));

    sortEvents();
    renderEvents(events);
}

loadEvents();