# Markdown 요소 → View/Event 매핑 조사

readable-ui 설계를 위한 근거 자료. CommonMark 0.31.2 + GFM + 널리 쓰이는 확장(Directives, MDX, frontmatter 등)을 범위로, 각 요소가 어떤 뷰·이벤트로 대응될 수 있는지 정리.

## 핵심 인사이트

1. **CommonMark는 정적 문서 표현만 정의한다.** 22개 요소 중 어느 것도 `click/submit/change`를 의미하지 않는다. `link`와 `image`만이 "navigation"이라는 간접 이벤트를 가진다.
2. **"Button/Form/Input" 표현 표준은 존재하지 않는다.** 업계는 최소 6가지 관행(link-as-button, directive, raw HTML, MDX, fenced JSON manifest, markform 식 frontmatter+주석)으로 분기.
3. **2025~2026 등장한 AI UI 프로토콜(MCP Apps, AG-UI, Apps SDK)은 마크다운 자체를 UI 프로토콜로 쓰지 않는다.** 대신 iframe + JSON-RPC로 분리. readable-ui가 정면 경쟁자 없는 공백을 겨냥하는 셈.
4. **가장 AI-actionable한 표준 요소는 `link`와 `task list item`뿐.** 표·코드펜스·인용구 등은 표시 위주. readable-ui는 필연적으로 비표준 확장(directive 등)을 일부 채택해야 한다.
5. **현실적 최대공약수는 "GFM + remark-directive".** GitHub/Slack/대부분 에이전트가 기본 파싱 가능.

## 요소 매트릭스

컬럼 의미

- **element**: 요소명
- **md_syntax**: 예시 구문
- **html_view**: 기본 HTML 매핑
- **possible_views**: readable-ui 관점에서 확장 가능한 컴포넌트 뷰
- **possible_events**: 이벤트 대응
- **ai_actionability**: AI 에이전트가 이 요소로 액션을 트리거할 실질적 가능성 (High/Medium/Low)
- **notes**: 주의사항

### CommonMark 0.31.2

| element | md_syntax | html_view | possible_views | possible_events | ai_actionability | notes |
|---|---|---|---|---|---|---|
| thematic_break | `---` / `***` / `___` | `<hr>` | Divider, Section 경계 | 없음 | Low | 시각 구분자, 의미 payload 없음 |
| atx_heading | `# Title` ~ `######` | `<h1>`~`<h6>` | PageHeader, SectionHeader, Card.Title | 없음 (anchor navigate 가능) | Medium | slug anchor로 섹션 이동 기술 가능 |
| setext_heading | `Title\n===` | `<h1>`, `<h2>` | 동일 | 없음 | Medium | 두 단계만 |
| indented_code_block | 4-space 들여쓰기 | `<pre><code>` | CodeBlock | copy | Low | info string 없음, MDX 비호환 |
| fenced_code_block | ` ```lang ` | `<pre><code>` | CodeBlock, Mermaid, Math, **JSON/YAML manifest 주입**, Chart | 없음 (run은 커스텀) | **High** | info string이 사실상 유일한 확장 hook |
| html_block | `<div>…</div>` | 원본 HTML | Any | HTML 이벤트 | Medium | GFM이 `<script>`, `<iframe>`, `on*` 필터 |
| link_reference_definition | `[label]: /url` | (미출력) | - | 없음 | Low | 정의만 |
| paragraph | 일반 텍스트 | `<p>` | Text, Body | 없음 | Low | 기본 단위 |
| blockquote | `> text` | `<blockquote>` | **Callout, Alert, Banner, Admonition** (GFM alert 5종) | 없음 | Medium | `> [!NOTE/TIP/IMPORTANT/WARNING/CAUTION]` 공식 |
| list | `- item` / `1.` | `<ul>`/`<ol>` | List, Menu, NavList, Steps | 없음 | Medium | 내부 link/task로 액션 승격 |
| list_item | `- foo` | `<li>` | ListItem, MenuItem | 없음 | Medium | - |
| code_span | `` `code` `` | `<code>` | InlineCode, Kbd, Badge | 없음 | Low | - |
| emphasis | `*em*` | `<em>` | 강조 | 없음 | Low | - |
| strong | `**b**` | `<strong>` | 강조 | 없음 | Low | - |
| link | `[txt](url)` | `<a>` | **Button, NavLink, MenuItem, ActionTrigger** | **click → navigate/action** | **High** | URI scheme으로 액션 디스패치 (`mcp://`) |
| image | `![alt](url)` | `<img>` | Image, Avatar, Icon, Chart(SVG) | 없음 | Low | alt로 의미 전달 가능 |
| autolink | `<https://…>` | `<a>` | Link | click → navigate | Medium | - |
| raw_html_inline | `<span>` | 원본 HTML | Any | HTML 이벤트 | Medium | GFM tagfilter 적용 |
| hard_line_break | `  \n` | `<br>` | 줄바꿈 | 없음 | Low | - |
| soft_line_break | `\n` | 공백 | 공백 | 없음 | Low | 렌더러별 차이 |
| textual_content | 텍스트 | 텍스트 | Text | 없음 | Low | - |

### GFM 확장

| element | md_syntax | html_view | possible_views | possible_events | ai_actionability | notes |
|---|---|---|---|---|---|---|
| table | `\| h \|` / `\|---\|` | `<table>` | **DataGrid, Listing, Comparison** | 없음 (표준 한정) | Medium | rowspan/colspan 미지원, 셀 내 link/task만 이벤트 |
| table_row | `\| … \|` | `<tr>` | Row | 없음 | Low | - |
| table_cell | `\| cell \|` | `<td>`/`<th>` | Cell | 없음 | Low | 정렬 메타(`:---`)만 |
| task_list_item | `- [ ]` / `- [x]` | checkbox `<li>` | **Checkbox, ToggleListItem, Todo** | **toggle** | **High** | boolean state를 구문으로 직접 표현 |
| strikethrough | `~~text~~` | `<del>` | DeletedText, Diff | 없음 | Low | "폐기됨" 의미 |
| autolink_extended | bare URL / email | `<a>` | Link | click → navigate | Medium | `mailto:` 지원 |
| disallowed_raw_html | - | 이스케이프 | - | - | - | `<script>`, `<iframe>`, `on*` 등 필터 |
| footnote_reference | `[^1]` | `<sup><a>` | Footnote anchor | click → navigate | Medium | GFM 공식 |
| footnote_definition | `[^1]: text` | `<li>` | FootnoteItem | 없음 | Low | - |

### 널리 쓰이는 비표준 확장

| element | md_syntax | html_view | possible_views | possible_events | ai_actionability | notes |
|---|---|---|---|---|---|---|
| front_matter (YAML) | `---\nkey: v\n---` | (미출력, 메타) | Page metadata, Form schema, Permissions | 없음 | **High** | 구조화 메타데이터; 권한/역할/검증에 최적 |
| text_directive | `:name[content]{attrs}` | 커스텀 | Badge, Icon, Citation | 구현자 결정 | Medium | `remark-directive`; 2014년 제안 단계 |
| leaf_directive | `::name[content]{attrs}` | 커스텀 | **Button, Form field, Image with caption** | 구현자 결정 | **High** | 인터랙티브 컴포넌트 1:1 매핑 최적 |
| container_directive | `:::name{attrs}\n…\n:::` | 커스텀 | **Form, Card, Modal, Tabs, Accordion** | 구현자 결정 | **High** | 자식 블록 담기 가능 |
| mdx_jsx_text | `<X />` 인라인 | 컴포넌트 | Any React component | any | **High** (빌드) / Medium (런타임) | 런타임 임의 JSX 평가는 보안 이슈 |
| mdx_jsx_flow | `<X>…</X>` | 컴포넌트 | Any | any | High / Medium | - |
| mdx_expression | `{expr}` | 평가값 | Dynamic text | - | Low | LLM 생성 expression 위험 |
| mdx_esm | `import` | - | 모듈 로딩 | - | Low | 런타임 출력 부적합 |
| definition_list (Pandoc) | `Term\n: def` | `<dl>` | KeyValueList, PropertyList | 없음 | Medium | `remark-deflist` 필요 |
| html_comment | `<!-- … -->` | (미출력) | 메타 | 없음 | Medium | markform은 이걸 형태소 경계로 사용 |
| gfm_alert | `> [!NOTE]` ~ `> [!CAUTION]` | 커스텀 blockquote | **Alert, Callout** (5단계) | dismiss는 표준 밖 | High | note/tip/important/warning/caution |
| mermaid_fence | ` ```mermaid ` | 렌더된 SVG | DiagramViewer | 노드 click은 커스텀 | Medium | de-facto 표준 |
| math_fence / inline math | `$$…$$`, `$…$` | KaTeX/MathJax | MathBlock | 없음 | Low | 구현별 차이 |

## 인터랙션 표현 관행 비교

### Button

| 방식 | 예시 | 장점 | 단점 |
|---|---|---|---|
| Link-as-button | `[Submit](/api/submit)` | 표준 100%, 모든 렌더러 호환 | 사이드이펙트 표현 불가, GET-only 뉘앙스 |
| Link + action URI | `[Submit](mcp://tool/submit)` | 표준 구문 + 의미 주입 | 비표준 scheme은 렌더러별 처리 상이 |
| Link + fragment | `[Submit](#action-submit)` | 항상 유효한 fragment | 일반 anchor와 충돌 |
| Leaf directive | `::button[Submit]{action=submit}` | 컴포넌트-속성 1:1, 가독성 높음 | 플레인 GitHub에선 `::button…` 그대로 노출 |
| HTML inline | `<button data-action="submit">Submit</button>` | 네이티브 시맨틱 | GFM 필터, 많은 렌더러가 이스케이프 |
| MDX JSX | `<Button action="submit">Submit</Button>` | 타입 안전 | 런타임 임의 JSX는 위험, 빌드타임 위주 |
| Fenced JSON manifest | ` ```readable-ui\n{...}\n``` ` | 스키마 엄격 | 가독성 낮음 |
| Task list로 토글 | `- [ ] Submit` | GitHub 내 실체 | 1회성 액션엔 부적합 |
| Markform | frontmatter + `<!-- field kind="button" -->` | 폼 전체 구조화 | 단일 버튼엔 과잉 |

### Form / Input

| 방식 | 출처 | 평가 |
|---|---|---|
| Container directive (`:::form` + `::input`) | `remark-directive` | 구조 표현력 최고, 비표준이지만 "가장 마크다운다운" |
| HTML inline (`<form><input>`) | CommonMark HTML block | 제출 가능하지만 `<input>`은 많은 렌더러가 이스케이프 |
| MDX (`<Form><Input>`) | MDX | 빌드타임엔 완벽, 런타임 출력엔 부적합 |
| Task list로 체크만 | GFM | boolean 수준 제한 |
| Markform | frontmatter + 주석 필드 | 검증/상태까지 표현; 장황 |
| JSON Schema fence | react-jsonschema-form 관행 | 엄격하지만 일반 뷰어에선 JSON 텍스트 |

### Action URI scheme (실존/제안)

| 형식 | 상태 | 근거 |
|---|---|---|
| `mcp://tool/...`, `ui://server/resource` | 실재 | MCP Apps 사양 (modelcontextprotocol/ext-apps) |
| `action://submit` | 관행 수준 | IANA 등록 없음, 여러 프로젝트가 사용 |
| `#action-submit` | 관행 | 표준 URL fragment 재해석 |
| `javascript:` | 표준이지만 GFM disallow | 대부분 차단 |
| `data:` | 이미지는 허용, 링크는 제한 | - |

### 상태 표현 (validation / loading / disabled / permission)

**표준에는 없음.** 관행:

- **Disabled**: HTML `<button disabled>`만 표준. directive attribute(`{disabled=true}`)가 깔끔.
- **Loading**: alert 블록쿼트, directive attribute, 유니코드 스피너. AG-UI는 별도 이벤트 스트림(`TOOL_CALL_START/CHUNK`)으로 본문과 분리.
- **Validation error**: 인근 alert 블록쿼트(`> [!WARNING]`), directive 컨테이너(`:::error`), HTML `role="alert"`.
- **Permission**: 표준 없음. MCP Apps `_meta.ui.visibility: ["model","app"]`이 가장 가까운 선례. frontmatter 또는 directive attribute가 유일 경로.

### Table 한계

GFM table이 표준으로 표현 못 하는 것: row action, sort, filter, pagination, cell editing, rowspan/colspan. 진지한 DataGrid는 **table 렌더를 hook으로 override + fenced JSON or `:::datagrid` directive**가 업계 패턴.

### Unknown 컴포넌트 Fallback 권고

업계에서 가장 검증된 조합: **"primary = directive, fallback = link + alert + JSON fence"**. 한 요소를 항상 두 가지 직렬화로 동시 출력 — directive로 UI를 주고, 그 아래 AI가 읽을 링크/alert/JSON을 덧붙인다.

## 출처

- [CommonMark 0.31.2](https://spec.commonmark.org/0.31.2/)
- [GFM Spec](https://github.github.com/gfm/)
- [remark-directive](https://github.com/remarkjs/remark-directive) / [CommonMark directive 제안](https://talk.commonmark.org/t/generic-directives-plugins-syntax/444)
- [MDX](https://mdxjs.com/docs/what-is-mdx/)
- [mdast](https://github.com/syntax-tree/mdast)
- [GitHub Alerts](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax#alerts)
- [Cloudflare Markdown for Agents](https://blog.cloudflare.com/markdown-for-agents/)
- [MCP Apps 사양](https://github.com/modelcontextprotocol/ext-apps)
- [AG-UI Protocol](https://docs.ag-ui.com/introduction)
- [markform](https://github.com/jlevy/markform)
- [CommonMark Form 제안 (미채택)](https://talk.commonmark.org/t/introducing-markdown-extensions-for-form-input/432)
