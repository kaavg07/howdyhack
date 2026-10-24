async function testConnection() {
    const { data, error } =
        await window.supabaseClient
            .from('events')
            .select('*');

    console.log(data);
    console.log(error);
}

testConnection();

console.log("hello");