import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCourseStore } from '../store/useCourseStore';
import { useProfileStore } from '../store/useProfileStore';
import { toast } from 'react-toastify';

const Courses = () => {
    const navigate = useNavigate();
    const { profile, fetchProfile, isFetchingProfile } = useProfileStore();
    const {
        courses,
        currentCourse,
        isLoading,
        fetchAllCourses,
        fetchCourseById,
        createCourse,
        enrollInCourse,
        addQuiz,
        addQuestion,
        addNote,
        addPracticePaper
    } = useCourseStore();

    const isTeacher = profile?.role === "teacher";
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [courseSection, setCourseSection] = useState('overview');
    const [showCreateCourseModal, setShowCreateCourseModal] = useState(false);
    const [newCourseData, setNewCourseData] = useState({
        title: '',
        description: '',
        level: 'beginner',
        category: 'hiragana',
        coverImage: '',
    });
    const [activeQuiz, setActiveQuiz] = useState(null);
    const [quizAnswers, setQuizAnswers] = useState({});
    const [quizSubmitted, setQuizSubmitted] = useState(false);
    const [quizScore, setQuizScore] = useState(null);
    const [newNote, setNewNote] = useState('');
    const [newQuestion, setNewQuestion] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [newQuizData, setNewQuizData] = useState({
        title: '',
        description: '',
        questions: []
    });
    const [newQuestionData, setNewQuestionData] = useState({
        question: '',
        options: ['', '', '', ''],
        answer: ''
    });
    const [newPracticePaper, setNewPracticePaper] = useState({
        title: '',
        description: '',
        file: null
    });
    const [showAddQuizModal, setShowAddQuizModal] = useState(false);
    const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
    const [showAddPaperModal, setShowAddPaperModal] = useState(false);

    useEffect(() => {
        fetchProfile();
        fetchAllCourses();
    }, [fetchProfile, fetchAllCourses]);

    useEffect(() => {
        if (selectedCourse) {
            fetchCourseById(selectedCourse.id);
        }
    }, [selectedCourse, fetchCourseById]);

    const handleCreateCourse = async () => {
        await createCourse(newCourseData);
        setShowCreateCourseModal(false);
        setNewCourseData({
            title: '',
            description: '',
            level: 'beginner',
            category: 'hiragana',
            coverImage: '',
        });
    };

    const handleEnroll = async (courseId) => {
        await enrollInCourse(courseId);
        toast.success('Successfully enrolled in the course!');
    };

    const handleQuizSubmit = () => {
        if (!currentCourse?.quizzes) return;

        const quiz = currentCourse.quizzes.find(q => q.id === activeQuiz);
        if (!quiz) return;

        let score = 0;
        quiz.questions.forEach(q => {
            if (quizAnswers[q.id] === q.answer) {
                score++;
            }
        });

        setQuizScore({
            correct: score,
            total: quiz.questions.length,
            percentage: Math.round((score / quiz.questions.length) * 100)
        });
        setQuizSubmitted(true);
    };

    const handleAddNote = async () => {
        if (newNote.trim() && selectedCourse) {
            await addNote(selectedCourse.id, {
                content: newNote,
                tags: []
            });
            setNewNote('');
            toast.success('Note added successfully!');
        }
    };

    const handleAddQuestion = async () => {
        if (newQuestion.trim() && selectedCourse) {
            await addQuestion(selectedCourse.id, {
                question: newQuestion,
                answers: []
            });
            setNewQuestion('');
            toast.success('Question posted successfully!');
        }
    };

    const handleAddQuiz = async () => {
        if (selectedCourse && newQuizData.title.trim()) {
            await addQuiz(selectedCourse.id, newQuizData);
            setShowAddQuizModal(false);
            setNewQuizData({
                title: '',
                description: '',
                questions: []
            });
            toast.success('Quiz added successfully!');
        }
    };

    const handleAddQuestionToQuiz = async () => {
        if (selectedCourse && activeQuiz && newQuestionData.question.trim()) {
            await addQuestion(selectedCourse.id, activeQuiz, newQuestionData);
            setShowAddQuestionModal(false);
            setNewQuestionData({
                question: '',
                options: ['', '', '', ''],
                answer: ''
            });
            toast.success('Question added to quiz!');
        }
    };

    const handleAddPracticePaper = async () => {
        if (selectedCourse && newPracticePaper.title.trim()) {
            const formData = new FormData();
            formData.append('title', newPracticePaper.title);
            formData.append('description', newPracticePaper.description);
            if (newPracticePaper.file) {
                formData.append('file', newPracticePaper.file);
            }

            await addPracticePaper(selectedCourse.id, formData);
            setShowAddPaperModal(false);
            setNewPracticePaper({
                title: '',
                description: '',
                file: null
            });
            toast.success('Practice paper added successfully!');
        }
    };

    const filteredCourses = isTeacher
        ? courses.filter(course =>
            course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            course.description.toLowerCase().includes(searchTerm.toLowerCase()))
        : courses.filter(course =>
            course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            course.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const enrolledCourses = courses.filter(course => course.enrolled);
    const teachingCourses = courses.filter(course => course.instructorId === profile?.id);

    return (
        <div className="min-h-screen bg-stone-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-stone-800 mb-2">
                            {isTeacher ? 'Teaching Dashboard' : 'My Courses'}
                        </h1>
                        <p className="text-stone-600">
                            {isTeacher
                                ? 'Manage your courses and help students learn'
                                : 'Continue your Japanese learning journey'}
                        </p>
                    </div>

                    {isTeacher && (
                        <button
                            onClick={() => setShowCreateCourseModal(true)}
                            className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-medium whitespace-nowrap mt-4 md:mt-0"
                        >
                            Create New Course
                        </button>
                    )}
                </div>

                {/* Loading State */}
                {isLoading && (
                    <div className="flex justify-center items-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
                    </div>
                )}

                {/* Course Selection View */}
                {!isLoading && !selectedCourse ? (
                    <div>
                        {/* Search and Filter */}
                        <div className="mb-6">
                            <div className="relative w-full md:w-96">
                                <input
                                    type="text"
                                    placeholder="Search courses..."
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                <svg
                                    className="absolute left-3 top-2.5 h-5 w-5 text-stone-400"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                    />
                                </svg>
                            </div>
                        </div>

                        {/* Courses Grid */}
                        {filteredCourses.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredCourses.map((course) => (
                                    <div
                                        key={course.id}
                                        className="bg-white rounded-xl shadow-md overflow-hidden border border-stone-200 hover:shadow-lg transition-shadow cursor-pointer"
                                        onClick={() => setSelectedCourse(course)}
                                    >
                                        <div className="relative h-40">
                                            <img
                                                src={course.coverImage || 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60'}
                                                alt={course.title}
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                                                <h3 className="text-white font-bold text-xl">{course.title}</h3>
                                                <p className="text-amber-200 text-sm">{course.instructor || 'Unknown Instructor'}</p>
                                            </div>
                                        </div>
                                        <div className="p-4">
                                            <p className="text-stone-600 text-sm mb-3 line-clamp-2">{course.description}</p>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded">
                                                    {course.level ? course.level.charAt(0).toUpperCase() + course.level.slice(1) : 'Beginner'}
                                                </span>
                                                <div className="flex items-center">
                                                    <svg className="w-4 h-4 text-amber-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                    </svg>
                                                    <span className="font-medium">{course.rating || '4.5'}</span>
                                                    <span className="mx-1">•</span>
                                                    <span>{course.students || 0} students</span>
                                                </div>
                                            </div>
                                        </div>
                                        {course.progress > 0 && (
                                            <div className="px-4 pb-4">
                                                <div className="w-full bg-stone-200 rounded-full h-2">
                                                    <div
                                                        className="bg-amber-600 h-2 rounded-full"
                                                        style={{ width: `${course.progress}%` }}
                                                    ></div>
                                                </div>
                                                <p className="text-xs text-stone-500 mt-1">{course.progress}% complete</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-stone-200">
                                <svg
                                    className="mx-auto h-12 w-12 text-stone-400"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                                <h3 className="mt-2 text-lg font-medium text-stone-800">
                                    {isTeacher ? 'No courses created yet' : 'No courses enrolled yet'}
                                </h3>
                                <p className="mt-1 text-stone-600">
                                    {isTeacher
                                        ? 'Create your first course to start teaching'
                                        : 'Browse available courses to start learning'}
                                </p>
                                <div className="mt-6">
                                    {isTeacher ? (
                                        <button
                                            onClick={() => setShowCreateCourseModal(true)}
                                            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 focus:outline-none"
                                        >
                                            Create Course
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => navigate('/courses/all')}
                                            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 focus:outline-none"
                                        >
                                            Browse Courses
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Available Courses for Students */}
                        {!isTeacher && enrolledCourses.length > 0 && (
                            <div className="mt-12">
                                <h2 className="text-2xl font-bold text-stone-800 mb-6">Available Courses</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {courses
                                        .filter(course => !enrolledCourses.some(ec => ec.id === course.id))
                                        .slice(0, 3)
                                        .map((course) => (
                                            <div key={course.id} className="bg-white rounded-xl shadow-md overflow-hidden border border-stone-200">
                                                <div className="relative h-40">
                                                    <img
                                                        src={course.coverImage || 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60'}
                                                        alt={course.title}
                                                        className="w-full h-full object-cover"
                                                    />
                                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                                                        <h3 className="text-white font-bold text-xl">{course.title}</h3>
                                                        <p className="text-amber-200 text-sm">{course.instructor || 'Unknown Instructor'}</p>
                                                    </div>
                                                </div>
                                                <div className="p-4">
                                                    <p className="text-stone-600 text-sm mb-3 line-clamp-2">{course.description}</p>
                                                    <div className="flex justify-between items-center">
                                                        <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded text-xs">
                                                            {course.level ? course.level.charAt(0).toUpperCase() + course.level.slice(1) : 'Beginner'}
                                                        </span>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleEnroll(course.id);
                                                            }}
                                                            className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1 rounded-lg text-sm font-medium"
                                                        >
                                                            Enroll Now
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Course Detail View */
                    <div className="bg-white rounded-xl shadow-md overflow-hidden border border-stone-200">
                        {/* Course Header */}
                        <div className="relative">
                            <img
                                src={selectedCourse?.coverImage || 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60'}
                                alt={selectedCourse?.title}
                                className="w-full h-48 object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent p-6 flex flex-col justify-between">
                                <div>
                                    <button
                                        onClick={() => setSelectedCourse(null)}
                                        className="text-white hover:text-amber-300"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                        </svg>
                                    </button>
                                </div>
                                <div>
                                    <h2 className="text-3xl font-bold text-white">{selectedCourse?.title}</h2>
                                    <p className="text-amber-200">{selectedCourse?.instructor || 'Unknown Instructor'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Course Navigation */}
                        <div className="border-b border-stone-200">
                            <nav className="flex overflow-x-auto">
                                <button
                                    onClick={() => setCourseSection('overview')}
                                    className={`px-4 py-3 font-medium text-sm whitespace-nowrap ${courseSection === 'overview' ? 'text-amber-600 border-b-2 border-amber-600' : 'text-stone-600 hover:text-stone-900'}`}
                                >
                                    Overview
                                </button>
                                <button
                                    onClick={() => setCourseSection('lessons')}
                                    className={`px-4 py-3 font-medium text-sm whitespace-nowrap ${courseSection === 'lessons' ? 'text-amber-600 border-b-2 border-amber-600' : 'text-stone-600 hover:text-stone-900'}`}
                                >
                                    Lessons
                                </button>
                                <button
                                    onClick={() => setCourseSection('practice')}
                                    className={`px-4 py-3 font-medium text-sm whitespace-nowrap ${courseSection === 'practice' ? 'text-amber-600 border-b-2 border-amber-600' : 'text-stone-600 hover:text-stone-900'}`}
                                >
                                    Practice
                                </button>
                                <button
                                    onClick={() => setCourseSection('notes')}
                                    className={`px-4 py-3 font-medium text-sm whitespace-nowrap ${courseSection === 'notes' ? 'text-amber-600 border-b-2 border-amber-600' : 'text-stone-600 hover:text-stone-900'}`}
                                >
                                    My Notes
                                </button>
                                <button
                                    onClick={() => setCourseSection('doubts')}
                                    className={`px-4 py-3 font-medium text-sm whitespace-nowrap ${courseSection === 'doubts' ? 'text-amber-600 border-b-2 border-amber-600' : 'text-stone-600 hover:text-stone-900'}`}
                                >
                                    Questions
                                </button>
                                {isTeacher && (
                                    <button
                                        onClick={() => setCourseSection('manage')}
                                        className={`px-4 py-3 font-medium text-sm whitespace-nowrap ${courseSection === 'manage' ? 'text-amber-600 border-b-2 border-amber-600' : 'text-stone-600 hover:text-stone-900'}`}
                                    >
                                        Manage Course
                                    </button>
                                )}
                            </nav>
                        </div>

                        {/* Course Content */}
                        <div className="p-6">
                            {/* Overview Section */}
                            {courseSection === 'overview' && (
                                <div>
                                    <h3 className="text-xl font-bold text-stone-800 mb-4">About This Course</h3>
                                    <p className="text-stone-600 mb-6">{selectedCourse?.description}</p>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                        <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
                                            <h4 className="font-bold text-amber-800 mb-2">Course Level</h4>
                                            <p className="text-stone-700 capitalize">{selectedCourse?.level || 'beginner'}</p>
                                        </div>
                                        <div className="bg-stone-50 rounded-lg p-4 border border-stone-200">
                                            <h4 className="font-bold text-stone-800 mb-2">Category</h4>
                                            <p className="text-stone-700 capitalize">{selectedCourse?.category || 'general'}</p>
                                        </div>
                                        <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
                                            <h4 className="font-bold text-amber-800 mb-2">Students Enrolled</h4>
                                            <p className="text-stone-700">{selectedCourse?.students || 0}</p>
                                        </div>
                                    </div>

                                    <h3 className="text-xl font-bold text-stone-800 mb-4">What You'll Learn</h3>
                                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-8">
                                        <li className="flex items-start">
                                            <svg className="h-5 w-5 text-amber-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            <span className="text-stone-700">Master all {selectedCourse?.category === 'hiragana' ? 'hiragana' : selectedCourse?.category === 'katakana' ? 'katakana' : 'Japanese'} characters</span>
                                        </li>
                                        <li className="flex items-start">
                                            <svg className="h-5 w-5 text-amber-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            <span className="text-stone-700">Proper pronunciation and stroke order</span>
                                        </li>
                                        <li className="flex items-start">
                                            <svg className="h-5 w-5 text-amber-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            <span className="text-stone-700">Common words and vocabulary</span>
                                        </li>
                                        <li className="flex items-start">
                                            <svg className="h-5 w-5 text-amber-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            <span className="text-stone-700">Reading and writing practice</span>
                                        </li>
                                    </ul>

                                    {!isTeacher && selectedCourse?.progress === 0 && (
                                        <button
                                            onClick={() => setCourseSection('lessons')}
                                            className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg font-medium shadow-md"
                                        >
                                            Start Learning
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Lessons Section */}
                            {courseSection === 'lessons' && (
                                <div>
                                    <h3 className="text-xl font-bold text-stone-800 mb-6">Course Lessons</h3>

                                    {currentCourse?.lessons?.length > 0 ? (
                                        <div className="space-y-4">
                                            {currentCourse.lessons.map((lesson, index) => (
                                                <div key={index} className="border border-stone-200 rounded-lg overflow-hidden">
                                                    <div className="bg-stone-50 px-4 py-3 border-b border-stone-200">
                                                        <h4 className="font-bold text-stone-800">{lesson.sectionTitle}</h4>
                                                    </div>
                                                    <div className="divide-y divide-stone-200">
                                                        {lesson.contents.map((content, contentIndex) => (
                                                            <div key={contentIndex} className="p-4 flex items-center justify-between hover:bg-stone-50">
                                                                <div className="flex items-center">
                                                                    <div className={`w-8 h-8 rounded-full ${content.completed ? 'bg-amber-100 text-amber-800' : 'bg-stone-100 text-stone-800'} flex items-center justify-center mr-3`}>
                                                                        {contentIndex + 1}
                                                                    </div>
                                                                    <span className="font-medium">{content.title}</span>
                                                                </div>
                                                                {content.completed ? (
                                                                    <span className="text-sm text-green-600">Completed</span>
                                                                ) : (
                                                                    <button className="text-amber-600 hover:text-amber-700 font-medium">
                                                                        Start
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="bg-stone-50 rounded-lg p-8 text-center border border-stone-200">
                                            <svg
                                                className="mx-auto h-12 w-12 text-stone-400"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                                />
                                            </svg>
                                            <h3 className="mt-2 text-lg font-medium text-stone-800">
                                                {isTeacher ? 'No lessons added yet' : 'No lessons available yet'}
                                            </h3>
                                            <p className="mt-1 text-stone-600">
                                                {isTeacher
                                                    ? 'Add your first lesson to help students learn'
                                                    : 'Check back later for course content'}
                                            </p>
                                            {isTeacher && (
                                                <div className="mt-6">
                                                    <button
                                                        onClick={() => setCourseSection('manage')}
                                                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 focus:outline-none"
                                                    >
                                                        Add Lessons
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Practice Section */}
                            {courseSection === 'practice' && (
                                <div>
                                    <h3 className="text-xl font-bold text-stone-800 mb-6">Practice Materials</h3>

                                    {activeQuiz ? (
                                        <div className="bg-white rounded-lg border border-stone-200 p-6">
                                            <h4 className="text-lg font-bold text-stone-800 mb-4">
                                                {currentCourse?.quizzes?.find(q => q.id === activeQuiz)?.title}
                                            </h4>
                                            <p className="text-stone-600 mb-6">
                                                {currentCourse?.quizzes?.find(q => q.id === activeQuiz)?.description}
                                            </p>

                                            {quizSubmitted ? (
                                                <div className="text-center py-8">
                                                    <div className={`mx-auto w-24 h-24 rounded-full flex items-center justify-center ${quizScore.percentage >= 70 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} mb-4`}>
                                                        <span className="text-2xl font-bold">{quizScore.percentage}%</span>
                                                    </div>
                                                    <h5 className="text-lg font-bold text-stone-800 mb-2">
                                                        {quizScore.percentage >= 70 ? 'Great Job!' : 'Keep Practicing!'}
                                                    </h5>
                                                    <p className="text-stone-600 mb-6">
                                                        You got {quizScore.correct} out of {quizScore.total} questions correct.
                                                    </p>
                                                    <div className="flex justify-center space-x-4">
                                                        <button
                                                            onClick={() => {
                                                                setActiveQuiz(null);
                                                                setQuizSubmitted(false);
                                                                setQuizAnswers({});
                                                                setQuizScore(null);
                                                            }}
                                                            className="bg-stone-200 hover:bg-stone-300 text-stone-800 px-4 py-2 rounded-lg"
                                                        >
                                                            Back to Practice
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setQuizSubmitted(false);
                                                                setQuizAnswers({});
                                                                setQuizScore(null);
                                                            }}
                                                            className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg"
                                                        >
                                                            Try Again
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-6">
                                                    {currentCourse?.quizzes?.find(q => q.id === activeQuiz)?.questions.map((question) => (
                                                        <div key={question.id} className="border-b border-stone-200 pb-6">
                                                            <h5 className="font-bold text-stone-800 mb-3">{question.id}. {question.question}</h5>
                                                            <div className="space-y-2">
                                                                {question.options.map((option, idx) => (
                                                                    <label key={idx} className="flex items-center space-x-3 cursor-pointer">
                                                                        <input
                                                                            type="radio"
                                                                            name={`question-${question.id}`}
                                                                            value={option}
                                                                            checked={quizAnswers[question.id] === option}
                                                                            onChange={() => setQuizAnswers({ ...quizAnswers, [question.id]: option })}
                                                                            className="h-4 w-4 text-amber-600 focus:ring-amber-500"
                                                                        />
                                                                        <span className="text-stone-700">{option}</span>
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <div className="flex justify-end">
                                                        <button
                                                            onClick={handleQuizSubmit}
                                                            className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-lg font-medium"
                                                        >
                                                            Submit Quiz
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Quizzes */}
                                            <div>
                                                <div className="flex justify-between items-center mb-4">
                                                    <h4 className="font-bold text-stone-800">Quizzes</h4>
                                                    {isTeacher && (
                                                        <button
                                                            onClick={() => setShowAddQuizModal(true)}
                                                            className="text-sm bg-amber-600 hover:bg-amber-700 text-white px-3 py-1 rounded"
                                                        >
                                                            Add Quiz
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="space-y-3">
                                                    {currentCourse?.quizzes?.length > 0 ? (
                                                        currentCourse.quizzes.map((quiz) => (
                                                            <div
                                                                key={quiz.id}
                                                                className="border border-stone-200 rounded-lg p-4 hover:border-amber-300 cursor-pointer transition-colors"
                                                                onClick={() => setActiveQuiz(quiz.id)}
                                                            >
                                                                <h5 className="font-medium text-stone-800">{quiz.title}</h5>
                                                                <p className="text-sm text-stone-600 mt-1">{quiz.description}</p>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="border border-stone-200 rounded-lg p-4 text-center">
                                                            <p className="text-stone-500">No quizzes available yet</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Practice Papers */}
                                            <div>
                                                <div className="flex justify-between items-center mb-4">
                                                    <h4 className="font-bold text-stone-800">Practice Papers</h4>
                                                    {isTeacher && (
                                                        <button
                                                            onClick={() => setShowAddPaperModal(true)}
                                                            className="text-sm bg-amber-600 hover:bg-amber-700 text-white px-3 py-1 rounded"
                                                        >
                                                            Add Paper
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="space-y-3">
                                                    {currentCourse?.practicePapers?.length > 0 ? (
                                                        currentCourse.practicePapers.map((paper) => (
                                                            <div key={paper.id} className="border border-stone-200 rounded-lg p-4 hover:border-amber-300 transition-colors">
                                                                <h5 className="font-medium text-stone-800">{paper.title}</h5>
                                                                <p className="text-sm text-stone-600 mt-1">{paper.description}</p>
                                                                <div className="flex items-center mt-3 text-sm text-stone-500">
                                                                    <span>{paper.pages || 1} pages</span>
                                                                    <span className="mx-2">•</span>
                                                                    <span>{paper.downloads || 0} downloads</span>
                                                                </div>
                                                                <button className="mt-3 text-amber-600 hover:text-amber-700 text-sm font-medium">
                                                                    Download PDF
                                                                </button>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="border border-stone-200 rounded-lg p-4 text-center">
                                                            <p className="text-stone-500">No practice papers available yet</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Notes Section */}
                            {courseSection === 'notes' && (
                                <div>
                                    <h3 className="text-xl font-bold text-stone-800 mb-6">My Notes</h3>

                                    <div className="mb-6">
                                        <div className="flex">
                                            <input
                                                type="text"
                                                placeholder="Add a new note..."
                                                className="flex-1 border border-stone-300 rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                                value={newNote}
                                                onChange={(e) => setNewNote(e.target.value)}
                                            />
                                            <button
                                                onClick={handleAddNote}
                                                className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-r-lg"
                                            >
                                                Add
                                            </button>
                                        </div>
                                    </div>

                                    {currentCourse?.notes?.length > 0 ? (
                                        <div className="space-y-4">
                                            {currentCourse.notes.map((note) => (
                                                <div key={note.id} className="border border-stone-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                                                    <p className="text-stone-800">{note.content}</p>
                                                    <div className="flex justify-between items-center mt-3 text-sm text-stone-500">
                                                        <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                                                        {notes.length > 0 ? (
                                                            <div className="grid gap-4">
                                                                {notes.map((note, idx) => (
                                                                    <div key={idx} className="bg-white p-4 rounded-lg shadow-sm border border-stone-200">
                                                                        <div className="text-stone-800 font-medium">{note.title}</div>
                                                                        <div className="mt-2 text-stone-600 text-sm">{note.content}</div>

                                                                        {/* Tags Section */}
                                                                        <div className="mt-2">
                                                                            <span className="flex items-center space-x-1">
                                                                                {note.tags.map((tag, idx) => (
                                                                                    <span
                                                                                        key={idx}
                                                                                        className="bg-stone-100 px-2 py-0.5 rounded text-xs"
                                                                                    >
                                                                                        {tag}
                                                                                    </span>
                                                                                ))}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            // Fallback UI when there are no notes
                                                            <div className="bg-stone-50 rounded-lg p-8 text-center border border-stone-200">
                                                                <svg
                                                                    className="mx-auto h-12 w-12 text-stone-400"
                                                                    fill="none"
                                                                    viewBox="0 0 24 24"
                                                                    stroke="currentColor"
                                                                >
                                                                    <path
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                        strokeWidth={1}
                                                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                                                    />
                                                                </svg>
                                                                <h3 className="mt-2 text-lg font-medium text-stone-800">No notes yet</h3>
                                                                <p className="mt-1 text-stone-600">
                                                                    Add your first note to keep track of important concepts
                                                                </p>
                                                            </div>
                                                        )}
                                                        {/* Questions/Doubts Section */}
                                                        {courseSection === 'doubts' && (
                                                            <div>
                                                                <h3 className="text-xl font-bold text-stone-800 mb-6">Questions & Answers</h3>

                                                                <div className="mb-6">
                                                                    <div className="flex">
                                                                        <input
                                                                            type="text"
                                                                            placeholder="Ask a question..."
                                                                            className="flex-1 border border-stone-300 rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                                                            value={newQuestion}
                                                                            onChange={(e) => setNewQuestion(e.target.value)}
                                                                        />
                                                                        <button
                                                                            onClick={handleAddQuestion}
                                                                            className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-r-lg"
                                                                        >
                                                                            Ask
                                                                        </button>
                                                                    </div>
                                                                </div>

                                                                {currentCourse?.questions?.length > 0 ? (
                                                                    <div className="space-y-6">
                                                                        {currentCourse.questions.map((question) => (
                                                                            <div key={question.id} className="border border-stone-200 rounded-lg p-4">
                                                                                <div className="flex items-start space-x-3">
                                                                                    <div className="flex-shrink-0">
                                                                                        <div className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center text-stone-600">
                                                                                            {question.askedBy?.charAt(0) || 'U'}
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="flex-1">
                                                                                        <div className="flex items-center justify-between">
                                                                                            <h4 className="font-bold text-stone-800">{question.askedBy || 'Anonymous'}</h4>
                                                                                            <span className="text-sm text-stone-500">
                                                                                                {new Date(question.createdAt).toLocaleDateString()}
                                                                                            </span>
                                                                                        </div>
                                                                                        <p className="text-stone-700 mt-1">{question.question}</p>
                                                                                        {question.answers?.length > 0 && (
                                                                                            <div className="mt-4 space-y-3">
                                                                                                {question.answers.map((answer) => (
                                                                                                    <div key={answer.id} className="bg-stone-50 p-3 rounded-lg">
                                                                                                        <div className="flex items-center space-x-2 text-sm">
                                                                                                            <span className="font-bold text-stone-700">{answer.answeredBy || 'Teacher'}</span>
                                                                                                            <span className="text-stone-500">•</span>
                                                                                                            <span className="text-stone-500">
                                                                                                                {new Date(answer.createdAt).toLocaleDateString()}
                                                                                                            </span>
                                                                                                        </div>
                                                                                                        <p className="text-stone-700 mt-1">{answer.answer}</p>
                                                                                                    </div>
                                                                                                ))}
                                                                                            </div>
                                                                                        )}
                                                                                        <div className="mt-3">
                                                                                            <input
                                                                                                type="text"
                                                                                                placeholder="Add an answer..."
                                                                                                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                                                                                            />
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <div className="bg-stone-50 rounded-lg p-8 text-center border border-stone-200">
                                                                        <svg
                                                                            className="mx-auto h-12 w-12 text-stone-400"
                                                                            fill="none"
                                                                            viewBox="0 0 24 24"
                                                                            stroke="currentColor"
                                                                        >
                                                                            <path
                                                                                strokeLinecap="round"
                                                                                strokeLinejoin="round"
                                                                                strokeWidth={1}
                                                                                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                                                            />
                                                                        </svg>
                                                                        <h3 className="mt-2 text-lg font-medium text-stone-800">No questions yet</h3>
                                                                        <p className="mt-1 text-stone-600">
                                                                            Ask your first question to get help from the instructor
                                                                        </p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Course Management Section (Teacher Only) */}
                                                        {courseSection === 'manage' && isTeacher && (
                                                            <div>
                                                                <h3 className="text-xl font-bold text-stone-800 mb-6">Course Management</h3>

                                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                                                    <button
                                                                        onClick={() => setShowAddQuizModal(true)}
                                                                        className="border-2 border-dashed border-stone-300 rounded-lg p-6 text-center hover:border-amber-400 transition-colors"
                                                                    >
                                                                        <svg
                                                                            className="mx-auto h-10 w-10 text-stone-400"
                                                                            fill="none"
                                                                            viewBox="0 0 24 24"
                                                                            stroke="currentColor"
                                                                        >
                                                                            <path
                                                                                strokeLinecap="round"
                                                                                strokeLinejoin="round"
                                                                                strokeWidth={1}
                                                                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                                                            />
                                                                        </svg>
                                                                        <span className="mt-2 block text-sm font-medium text-stone-700">Add Quiz</span>
                                                                    </button>

                                                                    <button
                                                                        onClick={() => setShowAddPaperModal(true)}
                                                                        className="border-2 border-dashed border-stone-300 rounded-lg p-6 text-center hover:border-amber-400 transition-colors"
                                                                    >
                                                                        <svg
                                                                            className="mx-auto h-10 w-10 text-stone-400"
                                                                            fill="none"
                                                                            viewBox="0 0 24 24"
                                                                            stroke="currentColor"
                                                                        >
                                                                            <path
                                                                                strokeLinecap="round"
                                                                                strokeLinejoin="round"
                                                                                strokeWidth={1}
                                                                                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                                                            />
                                                                        </svg>
                                                                        <span className="mt-2 block text-sm font-medium text-stone-700">Add Practice Paper</span>
                                                                    </button>

                                                                    <button
                                                                        onClick={() => navigate(`/course/${selectedCourse.id}/edit`)}
                                                                        className="border-2 border-dashed border-stone-300 rounded-lg p-6 text-center hover:border-amber-400 transition-colors"
                                                                    >
                                                                        <svg
                                                                            className="mx-auto h-10 w-10 text-stone-400"
                                                                            fill="none"
                                                                            viewBox="0 0 24 24"
                                                                            stroke="currentColor"
                                                                        >
                                                                            <path
                                                                                strokeLinecap="round"
                                                                                strokeLinejoin="round"
                                                                                strokeWidth={1}
                                                                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                                                            />
                                                                        </svg>
                                                                        <span className="mt-2 block text-sm font-medium text-stone-700">Edit Course</span>
                                                                    </button>
                                                                </div>

                                                                <div className="bg-stone-50 rounded-lg p-6 border border-stone-200">
                                                                    <h4 className="font-bold text-stone-800 mb-4">Course Statistics</h4>
                                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                                        <div className="bg-white p-4 rounded-lg shadow-sm">
                                                                            <p className="text-sm text-stone-500">Students Enrolled</p>
                                                                            <p className="text-2xl font-bold text-stone-800">{selectedCourse?.students || 0}</p>
                                                                        </div>
                                                                        <div className="bg-white p-4 rounded-lg shadow-sm">
                                                                            <p className="text-sm text-stone-500">Completion Rate</p>
                                                                            <p className="text-2xl font-bold text-stone-800">
                                                                                {selectedCourse?.completionRate ? `${selectedCourse.completionRate}%` : '0%'}
                                                                            </p>
                                                                        </div>
                                                                        <div className="bg-white p-4 rounded-lg shadow-sm">
                                                                            <p className="text-sm text-stone-500">Average Quiz Score</p>
                                                                            <p className="text-2xl font-bold text-stone-800">
                                                                                {selectedCourse?.avgQuizScore ? `${selectedCourse.avgQuizScore}/100` : 'N/A'}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Create Course Modal */}
                                            {showCreateCourseModal && (
                                                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                                                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                                                        <div className="p-6">
                                                            <div className="flex justify-between items-center mb-4">
                                                                <h3 className="text-xl font-bold text-stone-800">Create New Course</h3>
                                                                <button
                                                                    onClick={() => setShowCreateCourseModal(false)}
                                                                    className="text-stone-500 hover:text-stone-700"
                                                                >
                                                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                    </svg>
                                                                </button>
                                                            </div>

                                                            <div className="space-y-4">
                                                                <div>
                                                                    <label className="block text-sm font-medium text-stone-700 mb-1">Course Title</label>
                                                                    <input
                                                                        type="text"
                                                                        className="w-full border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                                                        value={newCourseData.title}
                                                                        onChange={(e) => setNewCourseData({ ...newCourseData, title: e.target.value })}
                                                                    />
                                                                </div>

                                                                <div>
                                                                    <label className="block text-sm font-medium text-stone-700 mb-1">Description</label>
                                                                    <textarea
                                                                        rows={3}
                                                                        className="w-full border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                                                        value={newCourseData.description}
                                                                        onChange={(e) => setNewCourseData({ ...newCourseData, description: e.target.value })}
                                                                    />
                                                                </div>

                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div>
                                                                        <label className="block text-sm font-medium text-stone-700 mb-1">Level</label>
                                                                        <select
                                                                            className="w-full border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                                                            value={newCourseData.level}
                                                                            onChange={(e) => setNewCourseData({ ...newCourseData, level: e.target.value })}
                                                                        >
                                                                            <option value="beginner">Beginner</option>
                                                                            <option value="intermediate">Intermediate</option>
                                                                            <option value="advanced">Advanced</option>
                                                                        </select>
                                                                    </div>

                                                                    <div>
                                                                        <label className="block text-sm font-medium text-stone-700 mb-1">Category</label>
                                                                        <select
                                                                            className="w-full border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                                                            value={newCourseData.category}
                                                                            onChange={(e) => setNewCourseData({ ...newCourseData, category: e.target.value })}
                                                                        >
                                                                            <option value="hiragana">Hiragana</option>
                                                                            <option value="katakana">Katakana</option>
                                                                            <option value="kanji">Kanji</option>
                                                                            <option value="grammar">Grammar</option>
                                                                            <option value="vocabulary">Vocabulary</option>
                                                                        </select>
                                                                    </div>
                                                                </div>

                                                                <div>
                                                                    <label className="block text-sm font-medium text-stone-700 mb-1">Cover Image URL</label>
                                                                    <input
                                                                        type="text"
                                                                        className="w-full border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                                                        value={newCourseData.coverImage}
                                                                        onChange={(e) => setNewCourseData({ ...newCourseData, coverImage: e.target.value })}
                                                                    />
                                                                </div>

                                                                <div className="flex justify-end space-x-3 pt-4">
                                                                    <button
                                                                        onClick={() => setShowCreateCourseModal(false)}
                                                                        className="px-4 py-2 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50"
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                    <button
                                                                        onClick={handleCreateCourse}
                                                                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium"
                                                                    >
                                                                        Create Course
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Add Quiz Modal */}
                                            {showAddQuizModal && (
                                                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                                                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                                                        <div className="p-6">
                                                            <div className="flex justify-between items-center mb-4">
                                                                <h3 className="text-xl font-bold text-stone-800">Add New Quiz</h3>
                                                                <button
                                                                    onClick={() => setShowAddQuizModal(false)}
                                                                    className="text-stone-500 hover:text-stone-700"
                                                                >
                                                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                    </svg>
                                                                </button>
                                                            </div>

                                                            <div className="space-y-4">
                                                                <div>
                                                                    <label className="block text-sm font-medium text-stone-700 mb-1">Quiz Title</label>
                                                                    <input
                                                                        type="text"
                                                                        className="w-full border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                                                        value={newQuizData.title}
                                                                        onChange={(e) => setNewQuizData({ ...newQuizData, title: e.target.value })}
                                                                    />
                                                                </div>

                                                                <div>
                                                                    <label className="block text-sm font-medium text-stone-700 mb-1">Description</label>
                                                                    <textarea
                                                                        rows={3}
                                                                        className="w-full border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                                                        value={newQuizData.description}
                                                                        onChange={(e) => setNewQuizData({ ...newQuizData, description: e.target.value })}
                                                                    />
                                                                </div>

                                                                <div className="flex justify-end space-x-3 pt-4">
                                                                    <button
                                                                        onClick={() => setShowAddQuizModal(false)}
                                                                        className="px-4 py-2 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50"
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                    <button
                                                                        onClick={handleAddQuiz}
                                                                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium"
                                                                    >
                                                                        Add Quiz
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Add Question to Quiz Modal */}
                                            {showAddQuestionModal && (
                                                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                                                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                                                        <div className="p-6">
                                                            <div className="flex justify-between items-center mb-4">
                                                                <h3 className="text-xl font-bold text-stone-800">Add Question to Quiz</h3>
                                                                <button
                                                                    onClick={() => setShowAddQuestionModal(false)}
                                                                    className="text-stone-500 hover:text-stone-700"
                                                                >
                                                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                    </svg>
                                                                </button>
                                                            </div>

                                                            <div className="space-y-4">
                                                                <div>
                                                                    <label className="block text-sm font-medium text-stone-700 mb-1">Question</label>
                                                                    <input
                                                                        type="text"
                                                                        className="w-full border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                                                        value={newQuestionData.question}
                                                                        onChange={(e) => setNewQuestionData({ ...newQuestionData, question: e.target.value })}
                                                                    />
                                                                </div>

                                                                <div>
                                                                    <label className="block text-sm font-medium text-stone-700 mb-1">Options</label>
                                                                    {newQuestionData.options.map((option, idx) => (
                                                                        <div key={idx} className="flex items-center mb-2">
                                                                            <input
                                                                                type="radio"
                                                                                name="correctAnswer"
                                                                                checked={newQuestionData.answer === option}
                                                                                onChange={() => setNewQuestionData({ ...newQuestionData, answer: option })}
                                                                                className="mr-2"
                                                                            />
                                                                            <input
                                                                                type="text"
                                                                                className="flex-1 border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                                                                value={option}
                                                                                onChange={(e) => {
                                                                                    const newOptions = [...newQuestionData.options];
                                                                                    newOptions[idx] = e.target.value;
                                                                                    setNewQuestionData({ ...newQuestionData, options: newOptions });
                                                                                }}
                                                                            />
                                                                        </div>
                                                                    ))}
                                                                </div>

                                                                <div className="flex justify-end space-x-3 pt-4">
                                                                    <button
                                                                        onClick={() => setShowAddQuestionModal(false)}
                                                                        className="px-4 py-2 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50"
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                    <button
                                                                        onClick={handleAddQuestionToQuiz}
                                                                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium"
                                                                    >
                                                                        Add Question
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Add Practice Paper Modal */}
                                            {showAddPaperModal && (
                                                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                                                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                                                        <div className="p-6">
                                                            <div className="flex justify-between items-center mb-4">
                                                                <h3 className="text-xl font-bold text-stone-800">Add Practice Paper</h3>
                                                                <button
                                                                    onClick={() => setShowAddPaperModal(false)}
                                                                    className="text-stone-500 hover:text-stone-700"
                                                                >
                                                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                    </svg>
                                                                </button>
                                                            </div>

                                                            <div className="space-y-4">
                                                                <div>
                                                                    <label className="block text-sm font-medium text-stone-700 mb-1">Title</label>
                                                                    <input
                                                                        type="text"
                                                                        className="w-full border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                                                        value={newPracticePaper.title}
                                                                        onChange={(e) => setNewPracticePaper({ ...newPracticePaper, title: e.target.value })}
                                                                    />
                                                                </div>

                                                                <div>
                                                                    <label className="block text-sm font-medium text-stone-700 mb-1">Description</label>
                                                                    <textarea
                                                                        rows={3}
                                                                        className="w-full border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                                                        value={newPracticePaper.description}
                                                                        onChange={(e) => setNewPracticePaper({ ...newPracticePaper, description: e.target.value })}
                                                                    />
                                                                </div>

                                                                <div>
                                                                    <label className="block text-sm font-medium text-stone-700 mb-1">PDF File</label>
                                                                    <div className="mt-1 flex items-center">
                                                                        <input
                                                                            type="file"
                                                                            accept=".pdf"
                                                                            onChange={(e) => setNewPracticePaper({ ...newPracticePaper, file: e.target.files[0] })}
                                                                            className="block w-full text-sm text-stone-500
                                            file:mr-4 file:py-2 file:px-4
                                            file:rounded-md file:border-0
                                            file:text-sm file:font-semibold
                                            file:bg-amber-50 file:text-amber-700
                                            hover:file:bg-amber-100"
                                                                        />
                                                                    </div>
                                                                </div>

                                                                <div className="flex justify-end space-x-3 pt-4">
                                                                    <button
                                                                        onClick={() => setShowAddPaperModal(false)}
                                                                        className="px-4 py-2 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50"
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                    <button
                                                                        onClick={handleAddPracticePaper}
                                                                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium"
                                                                    >
                                                                        Add Paper
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
    </div>
                            );
};

                            export default Courses;
