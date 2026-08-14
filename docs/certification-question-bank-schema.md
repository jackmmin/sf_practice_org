# 자격증 문제은행 데이터 모델

여러 자격증(Provider, 언어, 버전 무관)을 계속 추가/적재할 수 있도록 설계한 2-오브젝트 구조입니다.

## 1. 오브젝트 구조

```
Certification__c (자격증 목록, 부모)
   └─(Master-Detail: Certification__c)─ Certification_Question__c (문제, 자식)
```

- `Certification_Question__c.Certification__c` 는 **Master-Detail** 관계입니다.
  - 자격증 삭제 시 문제도 함께 삭제(Cascade)됩니다.
  - 롤업 요약 필드(`Certification__c.Total_Question_Count__c`)로 자격증별 적재된 문제 수를 자동 집계합니다.
- 두 오브젝트 모두 **하나의 자격증 전용이 아닌 범용 구조**이며, Provider/Level/Category/Language는 텍스트 성격의 비제한(non-restricted) 피클리스트라 새 값이 생겨도 메타데이터 배포 없이 추가할 수 있습니다.

## 2. Certification__c (자격증 목록)

| 필드 API명 | 타입 | 설명 |
|---|---|---|
| Name | Text | 자격증명 (예: Slack Certified Administrator) |
| Certification_Code__c | Text, External ID, Unique | 내부 고유 키, upsert 기준 (예: `SLACK-ADMIN-201`) |
| Provider__c | Picklist (비제한) | 발급사 (Salesforce, AWS, Slack, Microsoft, Google, Other...) |
| Exam_Code__c | Text | 벤더 공식 시험 코드/명 (예: "Slack-Admin 201") |
| Version__c | Text | 시험/덤프 버전 (예: "20.0") |
| Level__c | Picklist | Foundational/Associate/Professional/Expert/Specialist |
| Category__c | Picklist | Administrator/Developer/Architect/Consultant/Analyst/Marketer/Other |
| Certification_Language__c | Multi-Select Picklist | 문제은행이 제공되는 언어(복수 선택 가능) |
| Status__c | Picklist | Active/Draft/Retired |
| Passing_Score_Percent__c | Percent | 합격 커트라인 |
| Exam_Duration_Minutes__c | Number | 시험 제한 시간(분) |
| Number_Of_Questions_On_Exam__c | Number | 실제 시험 출제 문항 수(문제은행 총량과는 별개) |
| Vendor_Website_URL__c | URL | 공식 자격증 페이지 |
| Description__c | Long Text Area | 자격증 설명 |
| Source_Document_Name__c | Text | 원본 파일명(예: PDF 덤프 파일명) — 출처 추적용 |
| Last_Synced_Date__c | Date | 문제은행 마지막 동기화 일자 |
| Total_Question_Count__c | Roll-Up (Count) | 자동 집계: 적재된 Certification_Question__c 수 |

## 3. Certification_Question__c (문제)

| 필드 API명 | 타입 | 설명 |
|---|---|---|
| Name | Auto Number (`Q-{0000000}`) | 시스템 자동 채번 |
| Certification__c | Master-Detail | 소속 자격증 (필수) |
| Question_Number__c | Number | 원본 문서상의 문제 번호 (NO.1, NO.2...) — 자격증 내에서만 의미 있음 |
| Question_External_Id__c | Text, External ID, Unique | **upsert 키**. 권장 형식: `{Certification_Code__c}-Q{Question_Number__c 4자리}` 예: `SLACK-ADMIN-201-Q001` |
| Question_Text__c | Long Text Area | 문제 원문(주 언어) |
| Question_Text_Translated__c | Long Text Area | 번역문(예: 한글 번역), 선택 |
| Option_A__c ~ Option_F__c | Long Text Area × 6 | 보기. 보기가 6개 미만이면 남는 필드는 빈 값 |
| Correct_Answer__c | Text | 정답 (예: `D`, 복수 정답은 `A,B,C`, True/False는 `True`/`False`) |
| Answer_Type__c | Picklist | Single Choice / Multiple Choice / True-False |
| Explanation__c | Long Text Area | 해설(주 언어) |
| Explanation_Translated__c | Long Text Area | 해설 번역문, 선택 |
| Topic__c | Text | 세부 주제/도메인 태그 (자격증마다 달라서 피클리스트 대신 자유 텍스트로 설계) |
| Difficulty__c | Picklist | Easy/Medium/Hard/Unknown |
| Question_Language__c | Picklist | 문제 원문 언어 |
| Question_Status__c | Picklist | Active/Needs Review/Duplicate/Retired |
| Source_Page_Number__c | Number | 원본 문서 내 페이지 번호 |
| External_Source_Reference__c | Text | 출처 자유 기술 (파일명+페이지 등) |

## 4. 확장 시 고려사항

- **새 자격증 추가**: `Certification__c` 레코드 1건만 새로 만들면 됨. Provider/Level/Category 값이 없으면 값만 추가(비제한 피클리스트라 관리자가 UI에서 즉시 추가 가능).
- **보기 개수가 6개를 넘는 자격증**: `Option_G__c`, `Option_H__c` 형태로 필드만 추가하면 되며 기존 데이터/화면 영향 없음.
- **문항 유형이 다양해지는 경우**(빈칸 채우기, 매칭 등): `Answer_Type__c` 피클리스트에 값 추가 + 필요 시 `Question_Format__c` 같은 보조 필드 추가로 대응 가능. 오브젝트 구조 변경 없이 확장.
- **중복 적재 방지**: 같은 자격증을 재적재(재업로드)할 때는 `Certification_Code__c`(자격증)와 `Question_External_Id__c`(문제) 두 External ID로 upsert하면 기존 레코드가 갱신되고 신규만 추가됨.

## 5. 첨부 CSV → 필드 매핑 (Slack Admin 201 예시)

`slack_admin_201_qa.csv` (No, Question, OptionA~F, Answer) 를 아래처럼 매핑합니다.

**Certification__c** (최초 1회만 생성)
| CSV/고정값 | 필드 |
|---|---|
| "Slack Certified Administrator" | Name |
| "SLACK-ADMIN-201" | Certification_Code__c |
| "Slack" | Provider__c |
| "Slack-Admin 201" | Exam_Code__c |
| "20.0" | Version__c |
| "Administrator" | Category__c |
| "EN;KO" | Certification_Language__c |
| "slack_admin_201_qa.csv" | Source_Document_Name__c |

**Certification_Question__c** (212건, CSV 1행 = 1레코드)
| CSV 컬럼 | 필드 |
|---|---|
| No | Question_Number__c |
| `"SLACK-ADMIN-201-Q" + No(4자리 zero-pad)` | Question_External_Id__c |
| Question | Question_Text__c |
| OptionA | Option_A__c |
| OptionB | Option_B__c |
| OptionC | Option_C__c |
| OptionD | Option_D__c |
| OptionE | Option_E__c |
| OptionF | Option_F__c |
| Answer | Correct_Answer__c |
| (고정) SLACK-ADMIN-201 | Certification__c (Certification_Code__c 조회로 매핑) |
| (고정) EN | Question_Language__c |
| (고정) Active | Question_Status__c |
