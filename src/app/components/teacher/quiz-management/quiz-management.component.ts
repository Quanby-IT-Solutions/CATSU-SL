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
  isCourseDropdownOpen = false;
  isClassDropdownOpen = false;
  currentClass: any;
  classes: any = [];

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
    this.getTeacherClasses();
    this.filteredQuizOptions = this.quizOptions.slice();
    this.filteredStudentOptions = this.studentOptions.slice();
  }
  get selectedQuizTitle(): string {
    return this.selectedQuiz == null ? 'Select a Quiz Above' : this.selectedQuiz.title;
  }


  getQuizzes() {
    this.API.showLoader();
    this.API.teacherGetQuizzes(this.currentCourse?.id, this.currentClass?.id).subscribe(
      (data: any) => {
        if (data.success) {
          this.quizzes = data.output;
          this.currentPage = 0; // Reset to first page when new data is loaded
        } else {
          this.API.failedSnackbar('Failed to load quizzes');
        }
        this.API.hideLoader();
      },
      (error) => {
        console.error('Error loading quizzes:', error);
        this.API.failedSnackbar('Error loading quizzes');
        this.API.hideLoader();
      }
    );
  }
  getTeacherClasses() {
    if (this.currentCourse) {
      this.API.teacherGetClassesByCourse(this.currentCourse.id).subscribe(
        (data: any) => {
          if (data.success) {
            this.classes = data.output.map((_class: any) => ({
              id: _class.id,
              name: _class.class,
              courseId: _class.courseid
            }));
          } else {
            this.API.failedSnackbar('Failed loading classes');
          }
        },
        (error) => {
          console.error('Error loading classes:', error);
          this.API.failedSnackbar('Error loading classes');
        }
      );
    } else {
      this.classes = [];
    }
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

  toggleCourseDropdown() {
    this.isCourseDropdownOpen = !this.isCourseDropdownOpen;
  }

  toggleClassDropdown() {
    this.isClassDropdownOpen = !this.isClassDropdownOpen;
  }


  changeCourse(course: any) {
    this.currentCourse = course;
    this.currentClass = null; // Reset class when course changes
    this.isCourseDropdownOpen = false;
    this.getTeacherClasses(); // Update class list for the selected course
    this.filterQuizzes();
  }

  changeClass(selectedClass: any) {
    this.currentClass = selectedClass;
    this.isClassDropdownOpen = false;
    this.filterQuizzes();
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
    this.selectedQuiz = null; // Clear selected quiz for creating a new one
    this.isModalOpen = true; // Open the modal
  }

  editQuiz(quiz: any) {
    this.selectedQuiz = quiz; // Set the selected quiz for editing
    this.isModalOpen = true; // Open the modal
  }

  closeQuiz() {
    this.isModalOpen = false
  }



  parseDate(date: string) {
    return this.API.parseDate(date);
  }

  filterQuizzes() {
    if (this.currentCourse || this.currentClass) {
      this.getQuizzes(); // This will now use the current course and class
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

  deleteQuiz(quizId: string) {
    if (confirm('Are you sure you want to delete this quiz?')) {
      this.API.deleteQuiz(quizId).subscribe(
        (response) => {
          if (response.success) {
            this.API.successSnackbar('Quiz successfully deleted!');
            this.getQuizzes(); // Refresh the quiz list after deletion
          } else {
            this.API.failedSnackbar('Failed to delete quiz.');
          }
        },
        (error) => {
          console.error('Error deleting quiz:', error);
          this.API.failedSnackbar('An error occurred while deleting the quiz.');
        }
      );
    }
  }

}
