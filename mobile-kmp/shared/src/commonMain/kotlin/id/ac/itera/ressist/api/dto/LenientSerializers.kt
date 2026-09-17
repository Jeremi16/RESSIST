package id.ac.itera.ressist.api.dto

import kotlinx.serialization.KSerializer
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.builtins.MapSerializer
import kotlinx.serialization.builtins.serializer
import kotlinx.serialization.descriptors.SerialDescriptor
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonDecoder
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

/**
 * The real backend sometimes encodes collections as JSON STRINGS
 * (e.g. "muted_courses":"[]" instead of "muted_courses":[]), contradicting
 * API_DOCUMENTATION.md. These serializers accept both shapes so one drifted
 * field can never force-close the app again.
 */
object LenientStringListSerializer : KSerializer<List<String>> {
    private val delegate = ListSerializer(String.serializer())
    override val descriptor: SerialDescriptor = delegate.descriptor

    override fun deserialize(decoder: Decoder): List<String> {
        require(decoder is JsonDecoder)
        return decodeList(decoder.decodeJsonElement())
    }

    override fun serialize(encoder: Encoder, value: List<String>) {
        encoder.encodeSerializableValue(delegate, value)
    }

    private fun decodeList(el: JsonElement): List<String> {
        when (el) {
            is JsonArray -> return el.mapNotNull { (it as? JsonPrimitive)?.content }
            is JsonPrimitive -> {
                if (!el.isString) return emptyList()
                val parsed: JsonElement = parseOrNull(el.content) ?: return emptyList()
                return decodeList(parsed)
            }
            else -> return emptyList()
        }
    }

    private fun parseOrNull(raw: String): JsonElement? {
        val s = raw.trim()
        if (s.isEmpty()) return null
        return runCatching { Json.parseToJsonElement(s) }.getOrNull()
    }
}

object LenientStringMapSerializer : KSerializer<Map<String, String>> {
    private val delegate = MapSerializer(String.serializer(), String.serializer())
    override val descriptor: SerialDescriptor = delegate.descriptor

    override fun deserialize(decoder: Decoder): Map<String, String> {
        require(decoder is JsonDecoder)
        return decodeMap(decoder.decodeJsonElement())
    }

    override fun serialize(encoder: Encoder, value: Map<String, String>) {
        encoder.encodeSerializableValue(delegate, value)
    }

    private fun decodeMap(el: JsonElement): Map<String, String> {
        when (el) {
            is JsonObject -> return el.mapValues { (_, v: JsonElement) ->
                (v as? JsonPrimitive)?.content.orEmpty()
            }
            is JsonPrimitive -> {
                if (!el.isString) return emptyMap()
                val parsed: JsonElement = runCatching {
                    Json.parseToJsonElement(el.content.trim())
                }.getOrNull() ?: return emptyMap()
                return decodeMap(parsed)
            }
            else -> return emptyMap()
        }
    }
}

/**
 * reminder_hours arrives as a string ("[24,12]") but may drift to a real
 * array ([24,12]). Normalizes both to the canonical string form (or null).
 */
object LenientNullableStringSerializer : KSerializer<String?> {
    private val delegate = String.serializer()
    override val descriptor: SerialDescriptor = delegate.descriptor

    override fun deserialize(decoder: Decoder): String? {
        require(decoder is JsonDecoder)
        val el: JsonElement = decoder.decodeJsonElement()
        when (el) {
            is JsonPrimitive -> return el.content
            is JsonArray -> {
                val parts: List<String> = el.mapNotNull { (it as? JsonPrimitive)?.content }
                return "[" + parts.joinToString(",") + "]"
            }
            is JsonObject -> return el.toString()
            else -> return null
        }
    }

    override fun serialize(encoder: Encoder, value: String?) {
        if (value == null) encoder.encodeNull() else encoder.encodeString(value)
    }
}
