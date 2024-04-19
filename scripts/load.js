import cliProgress from "cli-progress";
import { Pinecone } from "@pinecone-database/pinecone";
import { getCourse, getCourses } from "../src/lib/api.js";
import { pipeline } from "@xenova/transformers";

const pipe = await pipeline("embeddings", "Xenova/all-MiniLM-L6-v2");

let counter = 0;

const progressBar = new cliProgress.SingleBar();

// Load a single course into the index
const loadCourse = async (index, subject, number) => {
  const course = await getCourse(subject, number);

  if (!course) return;

  const { description } = course;

  if (!description) {
    console.log(`No description for ${subject} ${number}.`, course);

    return;
  }

  const result = await pipe(description, { pooling: "mean", normalize: true });

  counter++;

  await index.upsert([
    {
      id: `${subject} ${number}`,
      values: Array.from(result.data),
    },
  ]);
};

// Load all courses into the index
const load = async () => {
  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

  await pinecone.createIndex({
    name: PINECONE_INDEX_NAME,
    dimension: 384,
    spec: {
      serverless: {
        cloud: "aws",
        region: "us-east-1",
      },
    },
    waitUntilReady: true,
    suppressConflicts: true,
  });

  const index = pinecone.index(PINECONE_INDEX_NAME);

  const courseList = await getCourses();

  if (!courseList) return;

  const size = process.argv[2] || 5000;

  const sampledCourseList = courseList.filter(
    (_, index) => index % Math.ceil(courseList.length / size) === 0
  );

  progressBar.start(sampledCourseList.length, 0);

  for (const { subject, number } of sampledCourseList) {
    await loadCourse(index, subject, number);

    progressBar.increment();
  }

  progressBar.stop();

  console.log(
    `Inserted ${counter} documents into index ${PINECONE_INDEX_NAME} from ${courseList.length} courses.`
  );
};

load();
