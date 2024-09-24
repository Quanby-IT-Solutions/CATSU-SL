import { Component, ElementRef, Renderer2, OnInit } from '@angular/core';
import { APIService } from 'src/app/services/API/api.service';
import Swal from 'sweetalert2';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ProblemreportComponent } from 'src/app/components/general-modals/problemreport/problemreport.component';
import { Router } from '@angular/router';
// Define the type for sidebar items
interface SidebarItem {
  redirect: string;
  icon: string;
  routerLink: string;
}
@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
})
export class SidebarComponent implements OnInit {
  title: string = 'CATSU SpeechLab'; // Dynamically set title
  isSidebarMinimized: boolean = false;
  isStudent: boolean = this.API.getUserType() === '0';
  progress: number = 0;

  // Specify types for displayedItems, mainItemKeys, and specialItemKeys
  displayedItems!: { [key: string]: SidebarItem };
  mainItemKeys: string[] = []; // For items before the separator
  specialItemKeys: string[] = []; // For items after the separator

  // Sidebar items for students
  studentDashboardItems: { [key: string]: SidebarItem } = {
    DASHBOARD: {
      redirect: 'student/dashboard',
      icon: 'bx-border-all',
      routerLink: '/student/dashboard',
    },
    LAB: {
      redirect: 'student/lab',
      icon: 'bx-extension',
      routerLink: '/student/lab',
    },
    MEET: {
      redirect: 'student/quanhub',
      icon: 'bx-video',
      routerLink: '/student/quanhub',
    },
    TASKS: {
      redirect: '/student/to-do',
      icon: 'bx-notepad',
      routerLink: '/student/to-do',
    },
    'SPEECH LAB': {
      redirect: '/student/speechlab',
      icon: 'bx-notepad',
      routerLink: '/student/speechlab',
    },
    PERFORMANCE: {
      redirect: 'student/performance',
      icon: 'bx-line-chart',
      routerLink: '/student/performance',
    },
    DICTIONARY: {
      redirect: 'student/dictionary',
      icon: 'bx-book-bookmark',
      routerLink: '/student/dictionary',
    },
    'TEXT TO SPEECH': {
      redirect: 'student/texttospeech',
      icon: 'bx-user-voice',
      routerLink: '/student/texttospeech',
    },
    'SPEECH ANALYZER': {
      redirect: 'student/speech-analyzer/record-speech',
      icon: 'bx-user-voice',
      routerLink: '/student/speech-analyzer/record-speech',
    },
  };

  // Sidebar items for teachers
  teacherDashboardItems: { [key: string]: SidebarItem } = {
    DASHBOARD: {
      redirect: 'teacher/dashboard',
      icon: 'bx-border-all',
      routerLink: '/teacher/dashboard',
    },
    'MANAGE COURSES': {
      redirect: 'teacher/managecourse',
      icon: 'bx-book-reader',
      routerLink: '/teacher/managecourse',
    },
    'MANAGE CLASS': {
      redirect: 'teacher/manageclass',
      icon: 'bx-chalkboard',
      routerLink: '/teacher/manageclass',
    },
    MEET: {
      redirect: 'teacher/quanhub',
      icon: 'bx-video',
      routerLink: '/teacher/quanhub',
    },
    GRADES: {
      redirect: 'teacher/grade-list',
      icon: 'bx-spreadsheet',
      routerLink: '/teacher/grade-list',
    },
    'SPEECH LAB': {
      redirect: 'teacher/speechlab',
      icon: 'bx-spreadsheet',
      routerLink: '/teacher/speechlab',
    },
    DICTIONARY: {
      redirect: 'teacher/dictionary',
      icon: 'bx-book-bookmark',
      routerLink: '/teacher/dictionary',
    },
    'TEXT TO SPEECH': {
      redirect: 'teacher/texttospeech',
      icon: 'bx-user-voice',
      routerLink: '/teacher/texttospeech',
    },
    'SPEECH ANALYZER': {
      redirect: 'teacher/speech-analyzer/record-speech',
      icon: 'bx-user-voice',
      routerLink: '/teacher/speech-analyzer/record-speech',
    },
  };

  adminDashboardItems = {
    DASHBOARD: {
      redirect: 'admin/dashboard',
      icon: 'bx-border-all',
      routerLink: '/admin/dashboard',
    },
    USERS: {
      redirect: 'admin/users',
      icon: 'bx-user',
      routerLink: '/admin/users',
    },
    COUNT: {
      redirect: 'admin/count',
      icon: 'bxs-time-five',
      routerLink: '/admin/count',
    },
    SPEECHLAB: {
      redirect: 'admin/speechlab',
      icon: 'bxs-time-five',
      routerLink: '/admin/speechlab',
    },
  };

  principalDashboardItems = {
    DASHBOARD: {
      redirect: 'admin/dashboard',
      icon: 'bx-border-all',
      routerLink: '/admin/dashboard',
    },
    USERS: {
      redirect: 'admin/users',
      icon: 'bx-user',
      routerLink: '/admin/users',
    },
    COUNT: {
      redirect: 'admin/count',
      icon: 'bxs-time-five',
      routerLink: '/admin/count',
    },
  };

  constructor(
    private API: APIService,
    private elRef: ElementRef,
    private renderer: Renderer2,
    private modalService: NgbModal,
    private router: Router
  ) {}
  openModal() {
    const modalRef = this.modalService.open(ProblemreportComponent);
  }

  checkAccount() {
    return this.API.getUserType();
  }

  ngOnInit(): void {

    const accountType = this.API.getUserData().accountType;
    switch (accountType) {
      case 0: // Student
        this.displayedItems = this.studentDashboardItems;
        this.mainItemKeys = ['DASHBOARD', 'LAB', 'MEET', 'TASKS', 'SPEECH LAB']; // Main items
        this.specialItemKeys = ['DICTIONARY', 'TEXT TO SPEECH', 'SPEECH ANALYZER']; // Special items after separator
        break;
      case 1: // Teacher
        this.displayedItems = this.teacherDashboardItems;
        this.mainItemKeys = ['DASHBOARD', 'MANAGE COURSES', 'MANAGE CLASS', 'MEET', 'GRADES', 'SPEECH LAB']; // Main items
        this.specialItemKeys = ['DICTIONARY', 'TEXT TO SPEECH', 'SPEECH ANALYZER']; // Special items after separator
        break;
      case 2:
        this.displayedItems = this.adminDashboardItems;
        break;
        case 3:
        this.displayedItems = this.principalDashboardItems
        break;
        default:
          this.API.failedSnackbar('System Error');
          return;
    }

    this.initializeSidebarToggle();
  }

  initializeSidebarToggle() {

    const body: HTMLElement = this.elRef.nativeElement;
    const sidebar: HTMLElement = body.querySelector('nav') as HTMLElement;
    const toggle: HTMLElement = body.querySelector('.toggle') as HTMLElement;
    this.renderer.addClass(document.body, 'custom:ml-64');

    // Adding a click event listener to the toggle button
    toggle.addEventListener('click', () => {
      // Toggling the 'close' class on the sidebar
      sidebar.classList.toggle('close');

      // Toggling the class for the icon transformation
      const toggleIcon: HTMLElement = body.querySelector(
        '.bx-chevron-left.toggle'
      ) as HTMLElement;
      toggleIcon.classList.toggle('rotate');

      // Add transition styles using Renderer2 for the body element
      const transitionDuration = 300; // in milliseconds
      this.renderer.setStyle(
        document.body,
        'transition',
        `margin-left ${transitionDuration}ms ease-in-out`
      );

      // Set the 'margin-left' property based on whether the sidebar is closed or open
      if (sidebar.classList.contains('close')) {
        this.renderer.removeClass(document.body, 'custom:ml-64');
        this.renderer.addClass(document.body, 'custom:ml-20');
      } else {
        this.renderer.removeClass(document.body, 'custom:ml-20');
        this.renderer.addClass(document.body, 'custom:ml-64');
      }

      this.isSidebarMinimized = !this.isSidebarMinimized;
    });
  }
  confirmBox() {
    Swal.fire({
      title: 'Are you sure want to Logout?',
      text: 'You will be redirected to login',
      icon: 'warning',
      confirmButtonColor: 'rgb(116, 254, 189)',
      cancelButtonColor: '#7F7F7F',
      showCancelButton: true,
      confirmButtonText: 'Logout!',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.value) {
        Swal.fire({
          title: 'Logout Successfully!',
          text: 'Thank you for your time. :)',
          icon: 'success',
          confirmButtonColor: '#0172AF',
        }).then(() => {
          this.logout();
          this.renderer.removeClass(document.body, 'custom:ml-20');
          this.renderer.removeClass(document.body, 'custom:ml-64'); // Remove the margin-left style
        });
      } else if (result.dismiss === Swal.DismissReason.cancel) {
        Swal.fire({
          title: 'Cancelled',
          text: 'We are happy you stayed :)',
          icon: 'error',
          confirmButtonColor: '#0172AF', // Replace 'yourColor' with your preferred color
        });
      }
    });
  }
  navigate(location: string) {
    this.router.navigate([location]);
  }

  goOffline() {
    this.API.goOffline();
  }
  logout() {
    this.renderer.removeClass(document.body, 'min-[768px]:ml-64'); // Remove the margin-left style
    this.API.logout(); // Call the logout method from your API service
  }
}
