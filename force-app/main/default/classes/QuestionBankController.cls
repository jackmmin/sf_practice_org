public with sharing class QuestionBankController {
    @AuraEnabled(cacheable=true)
    public static List<Certification__c> getCertifications() {
        return [
            SELECT Id, Name, Certification_Code__c, Provider__c, Category__c,
                   Level__c, Total_Question_Count__c, Number_Of_Questions_On_Exam__c
            FROM Certification__c
            WHERE Status__c = 'Active'
            WITH USER_MODE
            ORDER BY Name
        ];
    }

    @AuraEnabled(cacheable=true)
    public static List<Certification_Question__c> getQuestions(Id certificationId) {
        return [
            SELECT Id, Question_Number__c, Question_Text__c,
                   Option_A__c, Option_B__c, Option_C__c, Option_D__c, Option_E__c, Option_F__c,
                   Correct_Answer__c, Answer_Type__c, Explanation__c, Topic__c
            FROM Certification_Question__c
            WHERE Certification__c = :certificationId AND Question_Status__c = 'Active'
            WITH USER_MODE
            ORDER BY Question_Number__c ASC
        ];
    }
}
