import { Component, OnInit } from '@angular/core';
import { NgbModal, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import { QuizCreationComponent } from '../teacher-modals/quiz-creation/quiz-creation.component';
import { APIService } from 'src/app/services/API/api.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-quiz-management',
  templateUrl: './quiz-management.component.html',
  styleUrls: ['./quiz-management.component.css'],
})
export class QuizManagementComponent implements OnInit {
  constructor(
    private modalService: NgbModal,
    private API: APIService,
    private router: Router
  ) {}

  isDropdownOpen = false;
  currentCourse: any;
  courses: any = [];
  mockAverageScore = 0;
  mockCompletionRate = 85;

  selectedQuiz: any;
  selectedStudent: any;

  quizOptions = ['Quiz A', 'Quiz B', 'Quiz C'];

  studentOptions = ['Kenneth', 'Felix', 'John'];

  filteredQuizOptions: string[] = [];
  filteredStudentOptions: string[] = [];

  quizzes: any = [];

  // Pagination Variables
  itemsPerPage: number = 10; // Max items per page
  currentPage: number = 0; // Current page index

  ngOnInit(): void {
    this.getQuizzes();
    this.getTeacherCourses();
    this.filteredQuizOptions = this.quizOptions.slice();
    this.filteredStudentOptions = this.studentOptions.slice();
  }
  get selectedQuizTitle(): string {
    return this.selectedQuiz == null ? 'Select a Quiz Above' : this.selectedQuiz.title;
  }


  getQuizzes() {
    this.API.showLoader();
    this.API.teacherGetQuizzes().subscribe((data) => {
      this.quizzes = data.output;
      this.API.hideLoader();
    });
  }

  getTeacherCourses() {
    this.courses = [];
    this.API.teacherAllCourses().subscribe((data) => {
      if (data.success) {
        for (let course of data.output) {
          var mode = 'LRSW';
          if (course.filter != null) {
            mode = course.filter;
          }
          this.courses.push({
            id: course.id,
            lang: course.languageid,
            title: course.course,
            lessons: course.lessons,
            description: course.details,
            image: course.image,
            mode: mode,
          });
        }
      } else {
        this.API.failedSnackbar('Failed loading courses');
      }
    });
  }

  selectQuiz(quiz: any) {
    this.selectedQuiz = quiz;
    this.resetStudent();
  }

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  changeCourse(course: any) {
    this.currentCourse = course;
    console.log(course);
    this.isDropdownOpen = false;
  }

  gettingAvg = false;

  getAverageScore(quiz: any) {
    this.search = '';
    this.resetStudent();
    this.selectedQuiz = quiz;
    this.gettingAvg = true;
    this.people = [];
    this.API.getQuizAverage(quiz.id).subscribe((data) => {
      if (data.output.length) {
        this.mockAverageScore = Number(Number(data.output[0].average).toFixed(4));
      } else {
        this.mockAverageScore = 0;
      }
      this.gettingAvg = false;
    });
  }

  search = '';
  people: any = [];
  searching = false;
  search$: any;

  searchPeople(event: any) {
    this.people = [];
    if (event.target.value.trim() == '') {
      return;
    }

    if (this.selectedQuiz == null) {
      return;
    }

    this.searching = true;
    this.search$?.unsubscribe();
    this.search$ = this.API.searchStudentInQuiz(event.target.value.trim().toLowerCase(), this.selectedQuiz.id).subscribe((data) => {
      this.searching = false;
      if (data.success) {
        for (let person of data.output) {
          this.people.push(person);
        }
      }
      this.search$?.unsubscribe();
    });
  }

  selectStudent(student: any) {
    this.selectedStudent = student;
    this.search = student.firstname + ' ' + student.lastname;
    this.people = [];
  }

  resetStudent() {
    this.selectedStudent = null;
    this.search = '';
  }

  isModalOpen = false;
  createQuiz() {
    this.isModalOpen = !this.isModalOpen
  }
  closeQuiz() {
    this.isModalOpen = false
  }

  editQuiz(quiz: any) {
    const modalOptions: NgbModalOptions = {
      centered: false,
    };

    const modalRef = this.modalService.open(QuizCreationComponent, modalOptions);
    modalRef.componentInstance.quiz = quiz;
    modalRef.componentInstance.courses = this.courses;
    modalRef.closed.subscribe((data) => {
      if (data != null) {
        this.getQuizzes();
      }
    });
  }

  parseDate(date: string) {
    return this.API.parseDate(date);
  }

  filterQuizzes() {
    if (!this.selectedQuiz) {
      this.filteredQuizOptions = this.quizOptions.slice();
    } else {
      this.filteredQuizOptions = this.quizOptions.filter((option) =>
        option.toLowerCase().includes(this.selectedQuiz.toLowerCase())
      );
    }
  }

  filterStudents() {
    if (!this.selectedStudent) {
      this.filteredStudentOptions = this.studentOptions.slice();
    } else {
      this.filteredStudentOptions = this.studentOptions.filter((option) =>
        option.toLowerCase().includes(this.selectedStudent.toLowerCase())
      );
    }
  }

  feedback = '';
  sendFeedback() {
    if (!this.API.checkInputs([this.feedback, this.selectedQuiz, this.selectedStudent])) {
      this.API.failedSnackbar('Complete fields before sending feedback.');
      return;
    }
    this.API.pushNotifications(
      `${this.API.getFullName()} sent a feedback`,
      `${this.API.getFullName()} sent a feedback about your quiz titled, <b>'${this.selectedQuiz.title}'</b>. ${this.API.getUserData().firstname} said <b>'${this.feedback}'</b>`,
      this.selectedStudent.id
    );
    this.API.successSnackbar('Successfully sent a feedback!');
    this.resetStudent();
    this.feedback = '';
  }

  navigateBack(): void {
    this.router.navigate(['teacher/t-home']);
  }

  navigateAnal(): void {
    if (this.selectedQuiz) {
      this.router.navigate(['teacher/quiz-analytics'], { state: { quiz: this.selectedQuiz } });
    } else {
      this.API.failedSnackbar('Please select a quiz');
    }
  }

  // Pagination Logic
  paginatedQuizzes() {
    const start = this.currentPage * this.itemsPerPage;
    return this.quizzes.slice(start, start + this.itemsPerPage);
  }

  prevPage() {
    if (this.currentPage > 0) {
      this.currentPage--;
    }
  }

  nextPage() {
    if ((this.currentPage + 1) * this.itemsPerPage < this.quizzes.length) {
      this.currentPage++;
    }
  }

  get totalPages() {
    return Math.ceil(this.quizzes.length / this.itemsPerPage);
  }
}
