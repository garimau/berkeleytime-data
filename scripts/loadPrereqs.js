import cliProgress from "cli-progress";
import { getCourse, getCourses } from "../src/lib/api.ts";

let counter = 0;

const prereqs = new Set();

const progressBar = new cliProgress.SingleBar();

const loadCourse = async (subject, number) => {
  const course = await getCourse(subject, number);

  if (!course) return;

  const { prereqs: _prereqs } = course;

  if (!_prereqs) return;

  // Split prereqs into fragments
  const fragments = _prereqs.split(/[.;]/);

  const courses = new Set();

  for (const fragment of fragments) {
    // Filter out phrases like "4th year standing" or "45 units"
    const matches = fragment.match(
      /((?:[A-Z][A-Za-z]+\s)*[A-Z]*\d[A-Z\d]*)\b(?! units)/g
    );

    if (!matches) continue;

    let previousSubject = null;

    for (const match of matches) {
      const split = match.split(" ");

      // Associate unidentifiable courses with the previous subject from the same fragment
      if (split.length === 1) {
        courses.add(`${previousSubject ?? subject} ${split[0]}`);

        continue;
      }

      const currentSubject = split.slice(0, -1).join(" ");
      const currentNumber = split[split.length - 1];

      courses.add(`${currentSubject} ${currentNumber}`);

      previousSubject = currentSubject;
    }
  }

  if (courses.size === 0) return;

  counter++;

  console.log(`${subject} ${number}:`, courses, _prereqs);
};

const load = async () => {
  const courseList = await getCourses();

  if (!courseList) return;

  const size = process.argv[2] || 20;

  const sampledCourseList = courseList.filter(
    (_, index) => index % Math.ceil(courseList.length / size) === 0
  );

  // progressBar.start(sampledCourseList.length, 0);

  for (const { subject, number } of sampledCourseList) {
    await loadCourse(subject, number);

    // progressBar.increment();
  }

  // progressBar.stop();

  console.log(`${counter}/${process.argv[2] || 20}/${courseList.length}`);
};

load();
