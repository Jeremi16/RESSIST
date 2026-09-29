package id.ac.itera.ressist

import id.ac.itera.ressist.api.NotFoundException
import id.ac.itera.ressist.api.SessionExpiredException
import id.ac.itera.ressist.data.InMemoryJsonCache
import id.ac.itera.ressist.data.OfflineCache
import kotlinx.coroutines.test.runTest
import kotlinx.datetime.Instant
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.builtins.serializer
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull

class OfflineCacheTest {
    private val t0 = Instant.parse("2026-09-26T08:00:00Z")
    private val ser = ListSerializer(String.serializer())

    @Test
    fun networkFailure_servesLastGoodDataAndFlagsOffline() = runTest {
        val cache = OfflineCache(InMemoryJsonCache()) { t0 }
        assertEquals(listOf("a"), cache.fetch("k", ser) { listOf("a") })
        assertNull(cache.offlineSince.value)

        val stale = cache.fetch("k", ser) { throw RuntimeException("UnknownHost") }
        assertEquals(listOf("a"), stale)
        assertEquals(t0, cache.offlineSince.value)

        cache.fetch("k", ser) { listOf("b") }
        assertNull(cache.offlineSince.value)
    }

    @Test
    fun apiAndSessionErrors_areNotMaskedByCache() = runTest {
        val cache = OfflineCache(InMemoryJsonCache()) { t0 }
        cache.fetch("k", ser) { listOf("a") }
        assertFailsWith<NotFoundException> { cache.fetch("k", ser) { throw NotFoundException("x", "y") } }
        assertFailsWith<SessionExpiredException> { cache.fetch("k", ser) { throw SessionExpiredException() } }
    }

    @Test
    fun emptyCache_rethrowsNetworkError() = runTest {
        val cache = OfflineCache(InMemoryJsonCache())
        assertFailsWith<RuntimeException> { cache.fetch("k", ser) { throw RuntimeException("offline") } }
    }

    @Test
    fun clear_dropsDataForNextAccount() = runTest {
        val cache = OfflineCache(InMemoryJsonCache())
        cache.fetch("k", ser) { listOf("a") }
        cache.clear()
        assertFailsWith<RuntimeException> { cache.fetch("k", ser) { throw RuntimeException("offline") } }
    }
}
