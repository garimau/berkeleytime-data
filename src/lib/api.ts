export const getCourses = async () => {
  try {
    const response = await fetch("https://stanfurdtime.com/api/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `
        query ExampleQuery {
          courseList {
            number
            subject
          }
        }
      `,
      }),
    });

    if (!response.ok) return;

    const {
      data: { courseList },
    } = await response.json();

    return courseList;
  } catch (error) {
    console.log(`Failed to fetch courses.`);
  }
};

export const getCourse = async (subject: string, courseNumber: string) => {
  try {
    const response = await fetch("https://stanfurdtime.com/api/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `
        query ExampleQuery {
          course(subject: "${subject}", courseNumber: "${courseNumber}") {
            description
            prereqs
          }
        }
      `,
      }),
    });

    if (!response.ok) return;

    const {
      data: { course },
    } = await response.json();

    return course;
  } catch (error) {
    console.log(`Failed to fetch course ${subject} ${courseNumber}.`);
  }
};
