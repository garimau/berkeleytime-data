import { JSDOM } from "jsdom";
import { join } from "path";
import { writeFile, readFile } from "fs/promises";

const DEGREE_PROGRAMS_URL =
  "https://guide.berkeley.edu/undergraduate/degree-programs/";

const DEGREE_PROGRAMS_PATH = join("out", "degree-programs-types.json");

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

  const nodes = document.querySelectorAll<HTMLLIElement>("li.program");

  const all: string[] = []; 
  const certificates: string[] = []; // 8
  const majors: string[] = []; // 6
  const minors: string[] = []; // 7
  const simultaneousDegrees: string[] = []; // 69
  const summerMinors: string[] = []; // 70

  Array.from(nodes).forEach((node) => {
    const span = node.querySelector<HTMLSpanElement>("a.pview span");
    const textContent = span?.textContent?.trim();
    if (textContent) {
      all.push(textContent);

      if (node.classList.contains("filter_8")) {
        certificates.push(textContent);
      }
      if (node.classList.contains("filter_6")) {
        majors.push(textContent);
      }
      if (node.classList.contains("filter_7")) {
        minors.push(textContent);
      }
      if (node.classList.contains("filter_69")) {
        simultaneousDegrees.push(textContent);
      }
      if (node.classList.contains("filter_70")) {
        summerMinors.push(textContent);
      }
    }
  });

  const degreePrograms = {
    all,
    certificates,
    majors,
    minors,
    simultaneousDegrees,
    summerMinors,
  };

  await writeFile(DEGREE_PROGRAMS_PATH, JSON.stringify(degreePrograms));

  console.log(
    `${all.length} degree programs scraped and saved, categorized by filters.`
  );
};

const initialize = async () => {
  const degreePrograms = await getDegreePrograms();
};

initialize();
