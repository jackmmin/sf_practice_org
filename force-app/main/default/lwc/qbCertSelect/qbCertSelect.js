import { LightningElement, wire } from 'lwc';
import getCertifications from '@salesforce/apex/QuestionBankController.getCertifications';

export default class QbCertSelect extends LightningElement {
    certifications;
    error;
    isLoading = true;

    @wire(getCertifications)
    wiredCertifications({ data, error }) {
        this.isLoading = false;
        if (data) {
            this.certifications = data.map((cert) => ({
                id: cert.Id,
                name: cert.Name,
                provider: cert.Provider__c,
                category: cert.Category__c,
                totalCount: cert.Total_Question_Count__c || 0
            }));
            this.error = undefined;
        } else if (error) {
            this.error = error;
            this.certifications = undefined;
        }
    }

    get hasCertifications() {
        return this.certifications && this.certifications.length > 0;
    }

    get hasNoCertifications() {
        return !this.isLoading && !this.error && this.certifications && this.certifications.length === 0;
    }

    handleSelect(event) {
        const certId = event.currentTarget.dataset.id;
        const cert = this.certifications.find((c) => c.id === certId);
        if (!cert) {
            return;
        }
        this.dispatchEvent(
            new CustomEvent('select', {
                detail: {
                    certificationId: cert.id,
                    certificationName: cert.name,
                    totalCount: cert.totalCount
                }
            })
        );
    }

    handleKeyup(event) {
        if (event.key === 'Enter' || event.key === ' ') {
            this.handleSelect(event);
        }
    }
}
