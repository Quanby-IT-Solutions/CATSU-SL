import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { APIService } from 'src/app/services/API/api.service';
import Swal from 'sweetalert2';
import { SurveyCertComponent } from 'src/app/components/student/student-modals/survey-cert/survey-cert.component';
import { NgbModal, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import { firstValueFrom, interval, Subscription } from 'rxjs';
import * as jspdf from 'jspdf';
import html2canvas from 'html2canvas';

interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string | number;
  status: 'seen' | 'unseen';
  clientTimestamp?: number;
  timeAgo?: string;
}

@Component({
  selector: 'app-notificationbox',
  templateUrl: './notificationbox.component.html',
  styleUrls: ['./notificationbox.component.css']
})
export class NotificationboxComponent implements OnInit, OnDestroy {
  @Input() set notifications(value: Notification[]) {
    this._notifications = value.map(notif => ({
      ...notif,
      clientTimestamp: Date.now() // Add current timestamp when notifications are set
    }));
    this.refreshTimestamps();
  }
  get notifications(): Notification[] {
    return this._notifications;
  }

  private _notifications: Notification[] = [];
  private refreshSubscription: Subscription | undefined;

  constructor(
    private API: APIService,
    private modalService: NgbModal,
    private cdr: ChangeDetectorRef
  ) {}


  ngOnInit() {
    this.markAllasInbox();
    this.refreshTimestamps();
    this.refreshSubscription = interval(60000).subscribe(() => {
      this.refreshTimestamps();
    });
  }


  ngOnDestroy() {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  refreshTimestamps() {
    const now = Date.now();
    this._notifications = this._notifications.map(notif => ({
      ...notif,
      timeAgo: this.getTimeAgo(notif.clientTimestamp || now, now)
    }));
    this.cdr.detectChanges();
  }

  getTimeAgo(timestamp: number, now: number): string {
    const seconds = Math.floor((now - timestamp) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 2592000) return `${Math.floor(seconds / 86400)} days ago`;
    return new Date(timestamp).toLocaleDateString();
  }
  getNotifications() {
    return this.notifications;
  }

  isUrgent(notif: string) {
    return notif.includes('[Urgent]');
  }

  removeTag(notif: string) {
    return notif.replace('[Urgent]', '').replace('[BROADCAST]','').replace('[ALERT]', '').replace('[CERT]', '');
  }

  removeBodyTags(notif: string) {
    return notif.split('[COURSEID]')[0];
  }

  markAllAsRead() {
    if (this.API.inbox <= 0) {
      this.API.justSnackbar('You have no new notifications to be marked as read');
      return;
    }
    this.API.markAllAsRead();
    this.notifications.forEach(notification => {
      if (notification.status !== 'seen') notification.status = 'seen';
    });
    this.API.inbox = 0;
    this.API.successSnackbar('All notifications have been marked as read');
  }

  markAllasInbox() {
    this.API.markAllAsInbox();
  }

  markAsRead(notification: Notification) {
    this.API.markAsRead(notification.id);
  }

  certInfo: any;

  async openMial(notification: Notification, index: number) {
    if (this.notifications[index].status !== 'seen') {
      this.API.inbox = Math.max(0, (this.API.inbox || 0) - 1);
    }
    this.notifications[index].status = 'seen';
    this.markAsRead(notification);
    if (notification.title.includes('[CERT]')) {
      const courseID = notification.message.split("[COURSEID]")[1];
      const survey = await this.API.getAnsweredSurveyStudent(courseID);
      this.certInfo = await this.API.getSurveyEntryStudent(courseID);
      Swal.fire({
        title: this.removeTag(notification.title),
        html: this.removeBodyTags(notification.message),
        icon: 'question',
        iconHtml: '<img src="assets/Notificationbox/mail_fill.png" alt="Custom Icon" style="width: 40px; height: 40px;">',
        confirmButtonText: survey.length > 0 ? 'Claim Certificate' : 'Complete Survey',
        cancelButtonText: 'Close',
        showCancelButton: true,
      }).then(async (result) => {
        if (result.isConfirmed) {
          const modalOptions: NgbModalOptions = {
            centered: false,
          };

          if (survey.length <= 0) {
            const modalRef = this.modalService.open(
              SurveyCertComponent,
              modalOptions
            );
            modalRef.componentInstance.certInfo = this.certInfo;
          } else {
            await this.showCertificateModal(this.certInfo);
          }
        }
      });
    } else {
      Swal.fire({
        title: this.removeTag(notification.title),
        html: this.removeBodyTags(notification.message),
        icon: 'question',
        iconHtml: '<img src="assets/Notificationbox/mail_fill.png" alt="Custom Icon" style="width: 40px; height: 40px;">'
      });
    }
  }

async showCertificateModal(course: any) {
  console.log(course);
  const imageUrl = 'assets/cert/catsu-cert.png';
  const teacherSign = course.esign;
  console.log(teacherSign);
  const response = await firstValueFrom(this.API.getCNSCPresident());
  if (response.output.length <= 0) {
    this.API.failedSnackbar('Unable to retrieve certificate information');
  }
  const president = response?.output?.[0];
  if (!teacherSign) {
    this.API.failedSnackbar('Please sign the certificate on your profile.');
  }
  if (!president?.esign) {
    this.API.failedSnackbar('President have not signed the certificate yet.');
  }

  let certificateImageElement: HTMLImageElement;

  await Swal.fire({
    title: 'Certificate Preview',
    html: `
      <div style="width: 740px; height:500px;" class='select-none overflow-hidden relative flex justify-center'>
        <div id='printable-certificate' class='relative w-full h-full'>
          <div class='absolute top-[50%] left-6 w-full flex justify-center z-10 font-semibold text-3xl text-black'>
            ${this.API.getFullName()}
          </div>
          <div class='absolute top-[63.6%] left-6 w-full flex justify-center z-10 font-bold text-xs text-black'>
            ${course.course.toUpperCase()}
          </div>
          <div class='absolute bottom-[10.2%] left-[19%] w-full flex justify-center z-20'>
            <img src='${teacherSign ? this.API.getURL(teacherSign) : ''}' class='h-24 w-32 object-contain ${teacherSign ? '' : 'hidden'}'>
          </div>
          <div class='absolute bottom-[14%] left-[19%] w-full flex justify-center z-10 font-bold text-xs text-black'>
            ${course.firstname} ${course.lastname}
          </div>
          <div class='absolute bottom-[10.2%] right-[10%] w-full flex justify-center z-20'>
            <img src='${president?.esign ? this.API.getURL(president?.esign) : ''}' class='h-24 w-32 object-contain ${president?.esign ? '' : 'hidden'}'>
          </div>
          <div class='absolute bottom-[14%] right-[10%] w-full flex justify-center z-10 font-bold text-xs text-black'>
            ${president ? president.firstname.toUpperCase() + ' ' + president.lastname.toUpperCase() : ''}
          </div>
          <img src="${imageUrl}" alt="Certificate" id="certificateImage" style="position: absolute; z-index: 0; height: 100%; width: 100%; object-fit: cover; top: 50%; left: 50%; transform: translate(-50%, -50%);">
        </div>
      </div>
    `,
    showConfirmButton: false,
    showCancelButton: true,
    cancelButtonText: 'Close',
    cancelButtonColor: '#7F7F7F',
    customClass: {
      popup: 'wide-popup',
    },
    width: '800px',
    didOpen: () => {
      const element = document.getElementById('printable-certificate')!;
      certificateImageElement = element.querySelector('#certificateImage') as HTMLImageElement;
      console.log(element.offsetWidth, element.offsetHeight);
      html2canvas(element!, {
        scale: 3,
        useCORS: true,
      }).then((canvas) => {
        const contentDataURL = canvas.toDataURL('image/png');
        const aspectRatio = canvas.width / canvas.height;
        const pdfWidth = canvas.width;
        const pdfHeight = pdfWidth / aspectRatio;
        const pdf = new jspdf.jsPDF({ orientation: 'landscape', unit: 'px', format: [pdfWidth, pdfHeight] });
        pdf.addImage(contentDataURL, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${this.API.getUserData().lastname.toUpperCase().replaceAll(" ", "_")}_${this.API.getUserData().firstname.toUpperCase().replaceAll(" ", "_")}-Certificate.pdf`);

        // Update the certificate image dimensions to 100%
        certificateImageElement.style.height = '92%';
        certificateImageElement.style.width = '92%';
      });
    },
    willClose: () => {
      // Reset the certificate image dimensions to 92%
      certificateImageElement.style.height = '100%';
      certificateImageElement.style.width = '100%';
    },
  });
}}
