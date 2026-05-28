# Prompts

Prompt yazma qaydaları:

1. **Versionlama** — hər prompt versiyalı fayl olsun (`v1.ts`, `v2.ts`). Köhnə versiyaları silmə, A/B test üçün lazım olur.
2. **System və user ayrı** — system prompt davranışı təyin edir, user prompt isə konkret tapşırıq verir.
3. **XML tag-ları** — user input həmişə `<user_request>...</user_request>` kimi tag-larla əhatə olunmalı (prompt injection müdafiəsi).
4. **Few-shot** — hər prompt 3-5 nümunə ilə test olunsun: sadə, orta, mürəkkəb.
5. **Dəyişikliklər** — system prompt dəyişəndə Langfuse-də `prompt_version` tag-ını yenilə.
