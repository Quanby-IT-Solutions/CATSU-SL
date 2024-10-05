

import { Component, OnInit, Output } from '@angular/core';
import { NgbModal, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import { CreateCourseComponent } from '../teacher-modals/create-course/create-course.component';
import { APIService } from 'src/app/services/API/api.service';
import { Router } from '@angular/router';
import { EditCourseComponent } from '../teacher-modals/edit-course/edit-course.component';
import { firstValueFrom } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-tlesson',
  templateUrl: './managecourse.component.html',
  styleUrls: ['./managecourse.component.css']
})
export class ManageCourseComponent implements OnInit {
  languages: Map<string, any> = new Map();
  selectedLanguage: string = '';
  courseProgress: number = 100; // Set this to your desired initial value (e.g., 50%).

  getLiquidTopPosition(): string {
    return `-${this.courseProgress}px`; // Convert course progress to negative value for the top position
  }

   updateProgress(newProgress: number) {
    this.courseProgress = newProgress;
  }


  constructor(private modalService: NgbModal, private API: APIService, private router: Router) { }

  courseData: any = [];
  quizzes: any = [];
  topics: any= [];


  ngOnInit(): void {
    this.getQuizzes();

    this.API.getAllLanguages().subscribe(data => {
      if (data.success) {
        for (let language of data.output) {
          this.languages.set(language.language, language);
        }
      } else {
        this.API.failedSnackbar('Failed loading data');
      }
    });
    this.getTeacherCourses();
  }




  getQuizzes() {
    this.API.showLoader();
    this.API.teacherGetQuizzes().subscribe((data) => {
      this.quizzes = data.output;
      console.log("hahahaa", data.output);
      this.API.hideLoader();

    });
  }

  languageSelected(language: string) {
    this.selectedLanguage = language;
  }

  getTeacherCourses() {
    this.API.showLoader();
    this.courseData = [];
    this.API.teacherAllCourses().subscribe(data => {
      console.log('API response:', data);
      if (data.success) {
        for (let course of data.output) {
          let mode = 'LRSW';
          if (course.filter != null) {
            mode = course.filter;
          }

        let targetAudience = course.target_audience.replace(/[{}]/g, '').split(',');
        let technicalRequirements = course.technical_requirements.replace(/[{}]/g, '').split(',');

          try {
            targetAudience = course.target_audience ? JSON.parse(course.target_audience) : [];
          } catch (error) {
            console.error('Error parsing targetAudience:', error);
          }

          try {
            technicalRequirements = course.technical_requirements ? JSON.parse(course.technical_requirements) : [];
          } catch (error) {
            console.error('Error parsing technicalRequirements:', error);
          }

          this.courseData.push({
            id: course.id,
            lang: course.languageid,
            title: course.course,
            lessons: course.lessons,
            description: course.details,
            image: course.image,
            mode: mode,
            objectives: course.objectives,
            targetAudience: targetAudience,
            technicalRequirements: technicalRequirements
          });
        }
        this.API.hideLoader();
      } else {
        this.API.failedSnackbar('Failed loading courses');
      }
    });
  }

  removeCourse(courseID: string) {
    Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, Remove it!"
    }).then((result) => {
      if (result.isConfirmed) {
        this.API.deleteCourse(courseID).subscribe(() => {
          this.getTeacherCourses();
          Swal.fire({
            title: "Removed!",
            text: "Your file has been deleted.",
            icon: "success"
          });
        });
      }
    });
  }

  editCourse(course: any) {
    this.router.navigate(['teacher/manage-lessons', { cid: course.id }]);
  }

  openModal() {
    const modalOptions: NgbModalOptions = {
      centered: false
    };

    const modalRef = this.modalService.open(CreateCourseComponent, modalOptions);
    modalRef.componentInstance.myCustomClass = 'custom-modal'; // Pass the custom class name
    modalRef.componentInstance.languages = this.languages;
    modalRef.closed.subscribe(data => {
      if (data != null) {
        this.getTeacherCourses();
      }
    });
  }

  getURL(file: string) {
    if (file.includes('http')) {
      return file;
    } else {
      return this.API.getURL(file);
    }
  }

  openEdit(course: any) {
    const modalOptions: NgbModalOptions = {
      centered: false
    };
    console.log(course);
    const modalRef = this.modalService.open(EditCourseComponent, modalOptions);
    modalRef.componentInstance.myCustomClass = 'custom-modal';
    modalRef.componentInstance.languages = this.languages;
    modalRef.componentInstance.info = course;

    modalRef.closed.subscribe(data => {
      if (data != null) {
        this.getTeacherCourses();
      }
    });
  }

  async showCertificateModal(course: any) {
    const imageUrl = 'assets/cert/ace-cert.png'; // Replace with the actual URL or path to the certificate image
    const teacherSign = this.API.getUserData().esign;
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
    const result = await Swal.fire({
      title: 'Certificate Preview',
      html: `
        <div style="width: 740px;" class='select-none overflow-hidden'>
          <div class='relative w-full h-[500px]'>
            <div class='absolute top-[54%] left-6 w-full flex justify-center z-10 font-semibold text-3xl text-black'>
              JUAN DE LA CRUZ
            </div>

            <div class='absolute top-[64.8%] left-6 w-full flex justify-center z-10 font-bold text-xs text-black'>
              ${course.title.toUpperCase()}
            </div>

            <div class='absolute bottom-[9.2%] left-[19%] w-full flex justify-center z-20'>
              <img src ='${teacherSign ? this.API.getURL(teacherSign) : ''}' class=' h-24 w-32  object-contain ${teacherSign ? '' : 'hidden'}'>
            </div>
            <div class='absolute bottom-[13%] left-[19%] w-full flex justify-center z-10 font-bold text-xs text-black'>
              ${this.API.getFullName().toUpperCase()}
            </div>
            <div class='absolute bottom-[9.2%] right-[10%] w-full  flex justify-center z-20'>
              <img src ='${president?.esign ? this.API.getURL(president?.esign) : ''}' class=' h-24 w-32  object-contain ${president?.esign ? '' : 'hidden'}'>
            </div>
            <div class='absolute bottom-[13%] right-[10%] w-full flex justify-center z-10 font-bold text-xs text-black'>
              ${president ? president.firstname.toUpperCase() + ' ' + president.lastname.toUpperCase() : ''}
            </div>

            <img src="${imageUrl}" alt="Certificate" class='absolute' style="height: 100%; width:100%; object-fit: contain;'>
          </div>
          <button id="distribute-btn" class="swal2-confirm swal2-styled" style="margin-top: 20px;">Distribute</button>
        </div>
      `,
      showConfirmButton: false,
      showCancelButton: true,
      cancelButtonText: 'Close',
      customClass: {
        popup: 'wide-popup',
      },
      width: '800px',
      didOpen: () => {
        const popup = Swal.getPopup();
        if (popup) {
          const distributeBtn = popup.querySelector('#distribute-btn');
          if (distributeBtn) {
            distributeBtn.addEventListener('click', () => {
              Swal.fire({
                title: 'Distribute Certificates',
                text: 'Are you sure you want to distribute certificates to the eligible students?',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Yes, distribute',
                cancelButtonText: 'Cancel'
              }).then(async (confirmResult) => {
                if (confirmResult.isConfirmed) {
                  this.API.distributeCertificates(course.id)
                  Swal.fire('Certificates Distributed', 'Certificates have been successfully distributed to eligible students.', 'success');
                }
              });
            });
          }
        }
      },
    });

    if (result.dismiss === Swal.DismissReason.cancel) {
      console.log('Certificate preview closed without distribution.');
    }
  }

  redirectToLessons(courseID: string) {
    this.API.setCourse(courseID);
    this.router.navigate(['/teacher/lessons'], { queryParams: { hideMarkAsDone: true } });
  }

  trimText(text: string, wordLimit: number): string {
    if (!text) return '[NONE]';
    const words = text.split(' ');
    return words.length > wordLimit ? words.slice(0, wordLimit).join(' ') + '...' : text;
  }

}

