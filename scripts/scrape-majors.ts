import { JSDOM } from "jsdom";
import { join } from "path";
import { writeFile, readFile } from "fs/promises";

const DEGREE_PROGRAMS_URL =
  "https://guide.berkeley.edu/undergraduate/degree-programs/";

const DEGREE_PROGRAMS_PATH = join("out", "degree-programs.json");

const MAJOR_SELECTOR = "#majorrequirementstextcontainer";

interface RequirementCourse {
  type: "course";
  data: {
    subject: string;
    number: string;
  };
}

interface RequirementOperator {
  type: "operator";
  data: {
    operator: "and" | "or";
    children: Requirement[];
  };
}

type Requirement = RequirementCourse | RequirementOperator;

interface RequirementGroup {
  title?: string;
  requirements: Requirement[];
}

const getTitle = (element: HTMLElement) => {
  let previousSibling = element.previousElementSibling;

  while (previousSibling && previousSibling.tagName !== "H3") {
    previousSibling = previousSibling.previousElementSibling;
  }

  if (!previousSibling) return;

  return previousSibling.textContent?.trim();
};

const parseTable = (table: HTMLTableElement) => {
  const groups: RequirementGroup[] = [];

  let currentGroup: RequirementGroup | null = null;

  const rows = Array.from(
    table.querySelectorAll<HTMLTableRowElement>("tbody tr")
  );

  if (rows.length === 0) return groups;

  for (const row of rows) {
    // A new group started
    const title = row.querySelector<HTMLSpanElement>(
      "span.courselistcomment"
    );

    if (title) {
      const group = {
        title: title.textContent?.trim(),
        requirements: [],
      };

      groups.push(group);

      currentGroup = group;

      continue;
    }

    const root = row.querySelector<HTMLDivElement>("td.codecol");
    if (!root) continue;

    // A new requirement started
    const links = root.querySelectorAll<HTMLAnchorElement>("a.bubblelink");

    if (!links.length) continue;

    const courses = Array.from(links).map((link) =>
      link.text.replace(/\u00a0/g, " ")
    );

    const initialSubject = courses[0].split(" ").slice(0, -1).join(" ");

    const parsedCourses = courses.map((course) => {
      const items = course.split(" ");

      if (items.length === 1) {
        return {
          subject: initialSubject,
          number: course,
        };
      }

      const [number] = items.slice(-1);
      const subject = items.slice(0, -1).join(" ");

      return {
        subject,
        number,
      };
    });

    const requirement: Requirement =
      parsedCourses.length === 1
        ? {
            type: "course",
            data: parsedCourses[0],
          }
        : {
            type: "operator",
            data: {
              operator: "and",
              children: parsedCourses.map((course) => ({
                type: "course",
                data: course,
              })),
            },
          };

    // Add the requirement as the child of a new or existing operator
    const or = row.classList.contains("orclass");

    if (or) {
      const previousRequirement = currentGroup?.requirements.pop();

      if (!previousRequirement) continue;

      // Add the requirement to the previous operator
      if (
        previousRequirement.type === "operator" &&
        previousRequirement.data.operator === "or"
      ) {
        previousRequirement.data.children.push(requirement);

        currentGroup!.requirements.push(previousRequirement);

        continue;
      }

      // Create a new operator
      const parentRequirement: Requirement = {
        type: "operator",
        data: {
          operator: "or",
          children: [previousRequirement, requirement],
        },
      };

      currentGroup!.requirements.push(parentRequirement);

      continue;
    }

    // Add the requirement to the current group
    if (currentGroup) {
      currentGroup.requirements.push(requirement);

      continue;
    }

    // Create a new group
    const group = {
      requirements: [requirement],
    };

    groups.push(group);

    currentGroup = group;
  }

  return {
    title: getTitle(table),
    groups,
  };
};

export const getMajor = async (degreeProgram: string) => {
  const url = `${DEGREE_PROGRAMS_URL}${degreeProgram}/`;
  const response = await fetch(url);
  const text = await response.text();

  const {
    window: { document },
  } = new JSDOM(text, {
    url,
  });

  const root = document.querySelector<HTMLDivElement>(MAJOR_SELECTOR);

  if (!root) return [];

  const tables = root.querySelectorAll<HTMLTableElement>("table.sc_courselist");

  const sections = Array.from(tables).map((table) => parseTable(table));

  return sections;
};

export const getDegreeProgram = async (degreeProgram: string) => {
  return {
    identifier: degreeProgram,
    major: await getMajor(degreeProgram),
  };
};

export const getDegreePrograms = async () => {
  try {
    const text = await readFile(DEGREE_PROGRAMS_PATH, "utf-8");

    return JSON.parse(text);
  } catch {
    console.log("Degree programs not saved. Scraping...");
  }

  // Scrape degree programs if they don't exist
  const response = await fetch(DEGREE_PROGRAMS_URL);
  const text = await response.text();

  const {
    window: { document },
  } = new JSDOM(text, {
    url: DEGREE_PROGRAMS_URL,
  });

  const nodes =
    document.querySelectorAll<HTMLAnchorElement>("li.program a.pview");

  const degreePrograms = Array.from(nodes).map((node) =>
    node.href.slice(DEGREE_PROGRAMS_URL.length)
  );

  await writeFile(DEGREE_PROGRAMS_PATH, JSON.stringify(degreePrograms));

  console.log(`${degreePrograms.length} degree programs scraped and saved.`);

  return degreePrograms;
};

const initialize = async () => {
  const degreePrograms = await getDegreePrograms();

  // Pick a random degree program to scrape
  const degreeProgram =
    degreePrograms[Math.floor(Math.random() * degreePrograms.length)];

  console.dir(await getDegreeProgram(degreeProgram), { depth: null });

  // console.dir(await getDegreeProgram("society-environment"), { depth: null });
};

initialize();

// TODO: Some courses are listed as {subject} {number}/{number} (e.g. "MATH 1A/1B") or {subject} {number}/{subject} {number} (e.g. "MATH 1A/STAT 20A"). These should be split into separate courses.
// TODO: Try creating detailed AST examples and feeding HTML into Claude or GPT to generate the ASTs
