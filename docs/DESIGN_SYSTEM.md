# AI Workflow Platform — Dizayn Sistemi

> Bu sənəd platformanın vizual dizayn dilini müəyyən edir. Claude Code bunu tətbiq edəcək.

## Ümumi konsepsiya

**Stil:** Müasir, təmiz, texniki minimalizm — Linear və Vercel kimi, amma isti narıncı şəxsiyyəti ilə.

**Hiss:** "Bu, ciddi, professional bir alətdir, amma soyuq və korporativ deyil — dostcasına və enerjilidir."

**Əsas prinsip:** Workflow automation mürəkkəb işdir. Dizayn bu mürəkkəbliyi azaltmalı, sakitləşdirməlidir — səs-küy yaratmamalıdır. Boşluq, aydınlıq, sakitlik.

## Rəng palitrası

### Vurğu rəngi — Narıncı (Amber/Orange)

```
--accent-50:  #FFF7ED   (ən açıq fon)
--accent-100: #FFEDD5
--accent-200: #FED7AA
--accent-300: #FDBA74
--accent-400: #FB923C
--accent-500: #F97316   (ƏSAS vurğu rəngi — düymələr, aktiv elementlər)
--accent-600: #EA580C   (hover, tünd vurğu)
--accent-700: #C2410C
--accent-800: #9A3412
--accent-900: #7C2D12
```

### Neytral baza (Dark mode əsas)

```
--bg-base:      #0A0A0B   (ən dərin fon — səhifə arxası)
--bg-surface:   #141416   (kartlar, panellər)
--bg-elevated:  #1C1C1F   (yüksəldilmiş elementlər, modal-lar)
--bg-hover:     #232327   (hover vəziyyəti)

--border-subtle: #26262A  (incə sərhədlər)
--border-default: #33333A (standart sərhədlər)
--border-strong: #44444D  (vurğulu sərhədlər)

--text-primary:   #FAFAFA  (əsas mətn)
--text-secondary: #A1A1AA  (ikincil mətn)
--text-tertiary:  #71717A  (işarələr, placeholder)
--text-disabled:  #52525B
```

### Light mode (toggle ilə)

```
--bg-base:      #FAFAF9
--bg-surface:   #FFFFFF
--bg-elevated:  #FFFFFF
--bg-hover:     #F5F5F4

--border-subtle: #E7E5E4
--border-default: #D6D3D1
--text-primary:   #1C1917
--text-secondary: #57534E
--text-tertiary:  #A8A29E
```

### Semantik rənglər

```
--success: #10B981  (yaşıl — uğurlu run)
--warning: #F59E0B  (amber — xəbərdarlıq)
--error:   #EF4444  (qırmızı — xəta)
--info:    #3B82F6  (mavi — məlumat)
```

## Tipografiya

**Vacib:** Inter istifadə ETMƏ — çox generic. Bunun əvəzinə:

### Başlıq fontu (display)

**Geist** və ya **Satoshi** — müasir, texniki, xarakterli.
Geist Vercel-in fontudur, pulsuzdur, bu janr üçün ideal.

```
--font-display: "Geist", -apple-system, sans-serif;
```

### Mətn fontu (body)

**Geist** (eyni ailə) və ya **Söhne** alternativi.
Sadəlik üçün hər yerdə Geist istifadə et — display + body.

### Mono font (kod, workflow JSON)

**Geist Mono** və ya **JetBrains Mono**.

```
--font-mono: "Geist Mono", "JetBrains Mono", monospace;
```

### Ölçülər və çəkilər

```
H1: 32px, weight 600, letter-spacing -0.02em
H2: 24px, weight 600, letter-spacing -0.01em
H3: 18px, weight 500
Body: 15px, weight 400, line-height 1.6
Small: 13px, weight 400
Caption: 12px, weight 400, color text-tertiary
```

İki çəki kifayətdir: 400 (normal) və 600 (başlıq). 700 çox ağırdır.

## Spacing (boşluq sistemi)

4px-lik şəbəkə:

```
xs: 4px
sm: 8px
md: 12px
lg: 16px
xl: 24px
2xl: 32px
3xl: 48px
4xl: 64px
```

**Qayda:** Səxavətli boşluq. Sıxma. Elementlər nəfəs almalıdır.

## Künclər (border radius)

```
--radius-sm: 6px   (kiçik elementlər, badge)
--radius-md: 8px   (düymələr, input)
--radius-lg: 12px  (kartlar)
--radius-xl: 16px  (böyük panellər, modal)
--radius-full: 9999px (pill, avatar)
```

## Kölgələr

Dark mode-da kölgə az istifadə olunur — bunun əvəzinə border və bg fərqi ilə dərinlik yaradılır. Yalnız yüksəldilmiş elementlər (modal, dropdown) üçün:

```
--shadow-sm: 0 1px 2px rgba(0,0,0,0.3)
--shadow-md: 0 4px 12px rgba(0,0,0,0.4)
--shadow-lg: 0 8px 32px rgba(0,0,0,0.5)
```

Vurğu elementləri üçün glow əvəzinə incə narıncı border istifadə et.

## Komponent üslubu

### Düymələr

**Primary (əsas):** narıncı fon (`--accent-500`), ağ mətn, hover-də `--accent-600`, radius-md, padding 10px 16px, weight 500.

**Secondary:** şəffaf fon, `--border-default` border, hover-də `--bg-hover`, mətn `--text-primary`.

**Ghost:** tam şəffaf, yalnız hover-də `--bg-hover`. İkonlu düymələr üçün.

Bütün düymələrdə: `transition: all 0.15s ease`, active-də `scale(0.98)`.

### Kartlar

```
background: var(--bg-surface)
border: 1px solid var(--border-subtle)
border-radius: var(--radius-lg)
padding: 20px 24px
hover: border-color var(--border-default), transition 0.2s
```

### Input / Textarea

```
background: var(--bg-base)
border: 1px solid var(--border-default)
border-radius: var(--radius-md)
padding: 10px 14px
focus: border-color var(--accent-500), incə narıncı ring (0 0 0 3px rgba(249,115,22,0.15))
```

### Workflow Canvas (React Flow)

- Fon: `--bg-base` (dərin qara), incə nöqtəli grid (dots) `--border-subtle` rəngdə
- Node-lar: `--bg-surface` fon, `--border-default` border, radius-lg
- Aktiv/seçili node: `--accent-500` border (2px)
- Bağlantılar (edges): `--text-tertiary` rəng, animasiyalı "axın" effekti narıncı ilə
- Node ikonları: hər node tipi üçün uyğun rəng (gmail → qırmızı, http → mavi, transform → bənövşəyi, condition → amber)

## Animasiya və mikro-interaksiyalar

- **Səhifə yüklənməsi:** elementlər ardıcıl (staggered) görünsün, `animation-delay` ilə. Yuxarıdan aşağı, 50ms fərqlə.
- **Hover:** yumşaq, sürətli (0.15s). Şişirdilmiş deyil.
- **Workflow generation:** "düşünür" vəziyyəti — narıncı pulsasiya və ya skeleton loader.
- **Run statusu:** real-time dəyişmə — pending (boz) → running (narıncı pulsasiya) → completed (yaşıl) → failed (qırmızı).
- **Keçidlər (transitions):** səhifələr arası yumşaq fade.

Prinsip: animasiya **funksional** olmalıdır (status, feedback), dekorativ deyil. Az, amma keyfiyyətli.

## Layout

- **Sidebar:** sol tərəfdə, sabit, `--bg-surface`. Naviqasiya ikonları + mətn. Aktiv element narıncı vurğu ilə.
- **Topbar:** organization switcher (Clerk), user button, sağda. Minimal.
- **Əsas məzmun:** geniş boşluqlu, max-width məhdudiyyəti (məsələn 1200px) çox geniş ekranlarda.
- **Dashboard:** workflow-lar grid və ya list şəklində, hər biri kart.

## Atmosfer detalları

- Dark fon üzərində çox incə noise/grain texture (optional, çox subtil)
- Workflow canvas-da nöqtəli grid pattern
- Vurğu elementlərində incə narıncı glow (yalnız fokus/aktiv)
- Boş vəziyyətlər (empty states) üçün dostcasına illüstrasiya və ya ikon + mətn

## Nəyi ETMƏ

- ❌ Inter, Roboto, Arial fontları
- ❌ Bənövşəyi gradient ağ fonda (klişe AI görünüş)
- ❌ Çoxlu rəng — yalnız narıncı vurğu + neytral baza
- ❌ Ağır kölgələr, neon glow
- ❌ Sıxışdırılmış, boşluqsuz layout
- ❌ Şişirdilmiş animasiyalar
- ❌ 700 font weight (çox ağır)
