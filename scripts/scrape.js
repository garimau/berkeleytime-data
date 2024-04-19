import { writeFile } from "fs/promises";
import { join } from "path";

const buildings = new Set();
const locations = new Set();
const prerequisites = new Set();
let successful = 0;

const getCourse = async (abbreviation, courseNumber) => {
  try {
    const response = await fetch("https://berkeleytime.com/api/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        operationName: "GetCourseForName",
        variables: {
          abbreviation,
          courseNumber,
          semester: "spring",
          year: "2024",
        },
        query:
          "query GetCourseForName($abbreviation: String!, $courseNumber: String!, $year: String, $semester: String) {\n  allCourses(abbreviation: $abbreviation, courseNumber: $courseNumber, first: 1) {\n    edges {\n      node {\n        ...Course\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment Course on CourseType {\n  title\n  units\n  waitlisted\n  openSeats\n  letterAverage\n  gradeAverage\n  lastUpdated\n  id\n  hasEnrollment\n  gradeAverage\n  enrolledPercentage\n  enrolledMax\n  courseNumber\n  department\n  description\n  enrolled\n  abbreviation\n  prerequisites\n  playlistSet {\n    edges {\n      node {\n        category\n        id\n        name\n        semester\n        year\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n  sectionSet(year: $year, semester: $semester) {\n    edges {\n      node {\n        ...Section\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n  __typename\n}\n\nfragment Section on SectionType {\n  id\n  ccn\n  kind\n  instructor\n  startTime\n  endTime\n  enrolled\n  enrolledMax\n  locationName\n  waitlisted\n  waitlistedMax\n  days\n  wordDays\n  disabled\n  sectionNumber\n  isPrimary\n  __typename\n}\n",
      }),
    });

    const {
      data: {
        allCourses: {
          edges: [
            {
              node: {
                prerequisites: prereqs,
                sectionSet: { edges: sections },
              },
            },
          ],
        },
      },
    } = await response.json();

    sections.map(({ node: { locationName } }) => {
      const building = locationName.split(" ").slice(0, -1).join(" ");
      buildings.add(building);

      locations.add(locationName);

      prerequisites.add(prereqs);
    });

    console.log(abbreviation, courseNumber);

    successful++;
  } catch (error) {
    console.log(error, abbreviation, courseNumber);
  }
};

const getCourses = async () => {
  const response = await fetch(`https://berkeleytime.com/api/graphql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      operationName: "GetCoursesForFilter",
      variables: {
        playlists: "UGxheWxpc3RUeXBlOjMyNTQx",
      },
      query:
        "query GetCoursesForFilter($playlists: String!) {\n  allCourses(inPlaylists: $playlists) {\n    edges {\n      node {\n        ...CourseOverview\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment CourseOverview on CourseType {\n  id\n  abbreviation\n  courseNumber\n  description\n  title\n  gradeAverage\n  letterAverage\n  openSeats\n  enrolledPercentage\n  enrolled\n  enrolledMax\n  units\n  __typename\n}\n",
    }),
  });

  const {
    data: {
      allCourses: { edges },
    },
  } = await response.json();

  const courses = new Set();
  const abbreviations = new Set();

  for (const {
    node: { abbreviation, courseNumber },
  } of edges) {
    courses.add(`${abbreviation} ${courseNumber}`);
    abbreviations.add(abbreviation);

    // await getCourse(abbreviation, courseNumber);

    // await new Promise((resolve) => setTimeout(resolve, 10));
  }

  /*await writeFile(
    join("..", "out", "buildings.txt"),
    Array.from(buildings).join("\n")
  );

  await writeFile(
    join("..", "out", "locations.txt"),
    Array.from(locations).join("\n")
  );

  await writeFile(
    join("..", "out", "prerequisites.txt"),
    Array.from(prerequisites).join("\n")
  );*/

  await writeFile(
    join("..", "out", "courses.txt"),
    Array.from(courses).join("\n")
  );

  await writeFile(
    join("..", "out", "abbreviations.txt"),
    Array.from(abbreviations).join("\n")
  );

  console.log(successful, edges.length, successful / edges.length);
};

// (?:[A-Z][A-Za-z]+\s)*[A-Z]*\d[a-zA-Z\d]* to detect prereqs

getCourses();
