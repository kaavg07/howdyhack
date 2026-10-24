async function loadEvents() {
    console.log("loadEvents running");

    const { data, error } =
        await window.supabaseClient
            .from('events')
            .select('*');

    console.log(data);
    console.log(error);
}