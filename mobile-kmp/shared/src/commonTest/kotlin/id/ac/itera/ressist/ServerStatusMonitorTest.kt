package id.ac.itera.ressist

import id.ac.itera.ressist.api.ServerState
import id.ac.itera.ressist.api.ServerStatusMonitor
import id.ac.itera.ressist.api.createHttpClient
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.respond
import io.ktor.client.request.get
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.headersOf
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class ServerStatusMonitorTest {

    private val json = headersOf(HttpHeaders.ContentType, "application/json")

    @Test
    fun healthOk_isUp() = runTest {
        val monitor = ServerStatusMonitor(createHttpClient(MockEngine { respond("""{"status":"ok"}""", HttpStatusCode.OK, json) }), "https://test")
        assertEquals(ServerState.Up, monitor.check())
    }

    @Test
    fun healthMaintenance_isMaintenance() = runTest {
        val engine = MockEngine { respond("""{"status":"maintenance","message":"Upgrade DB"}""", HttpStatusCode.OK, json) }
        val monitor = ServerStatusMonitor(createHttpClient(engine), "https://test")
        assertEquals(ServerState.Maintenance("Upgrade DB"), monitor.check())
    }

    @Test
    fun connectionError_isDown() = runTest {
        val monitor = ServerStatusMonitor(createHttpClient(MockEngine { throw Exception("refused") }), "https://test")
        assertEquals(ServerState.Down, monitor.check())
    }

    @Test
    fun apiBadGateway_marksDown_otherHostIgnored() = runTest {
        val engine = MockEngine { req ->
            if (req.url.host == "test") respond("", HttpStatusCode.BadGateway) else respond("", HttpStatusCode.BadGateway)
        }
        val client = createHttpClient(engine)
        val monitor = ServerStatusMonitor(client, "https://test")
        client.get("https://api.github.com/x")
        assertEquals(ServerState.Up, monitor.state.value)
        client.get("https://test/v1/assignments")
        assertTrue(monitor.state.value == ServerState.Down)
    }
}
