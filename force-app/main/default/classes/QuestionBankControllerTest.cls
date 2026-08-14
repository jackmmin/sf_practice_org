@isTest
private class QuestionBankControllerTest {
    @TestSetup
    static void setup() {
        Certification__c cert = new Certification__c(
            Name = 'Test Certification',
            Certification_Code__c = 'TEST-CERT-001',
            Provider__c = 'Other',
            Status__c = 'Active'
        );
        insert cert;

        insert new Certification_Question__c(
            Certification__c = cert.Id,
            Question_Number__c = 1,
            Question_External_Id__c = 'TEST-CERT-001-Q0001',
            Question_Text__c = 'Sample question?',
            Option_A__c = 'A option',
            Option_B__c = 'B option',
            Correct_Answer__c = 'A',
            Answer_Type__c = 'Single Choice',
            Question_Language__c = 'EN',
            Question_Status__c = 'Active'
        );
    }

    @isTest
    static void testGetCertifications() {
        List<Certification__c> results = QuestionBankController.getCertifications();
        System.assertEquals(1, results.size(), 'Should return the active test certification');
    }

    @isTest
    static void testGetQuestions() {
        Certification__c cert = [SELECT Id FROM Certification__c LIMIT 1];
        List<Certification_Question__c> results = QuestionBankController.getQuestions(cert.Id);
        System.assertEquals(1, results.size(), 'Should return the test question');
    }
}
