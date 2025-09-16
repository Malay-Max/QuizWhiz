
import type { Category, Question } from '@/types';

// Omit 'id' and 'children' from sample categories, as they will be generated.
type SampleCategory = Omit<Category, 'id' | 'children'> & {
  id: string;
  questions: Omit<Question, 'id' | 'categoryId' | 'options' | 'correctAnswerId'> & {
    options: string[];
    correctAnswer: string;
  }[];
  children?: SampleCategory[];
};

export const sampleData: SampleCategory[] = [
  {
    id: 'literature',
    name: 'Literature',
    parentId: null,
    questions: [],
    children: [
      {
        id: 'american_lit',
        name: 'American Literature',
        parentId: 'literature',
        questions: [
          {
            text: 'In "Moby-Dick", what is the name of the whaling ship?',
            options: ['Pequod', 'Essex', 'Nautilus', 'Beagle'],
            correctAnswer: 'Pequod',
          },
          {
            text: 'Who wrote the novel "The Great Gatsby"?',
            options: ['F. Scott Fitzgerald', 'Ernest Hemingway', 'William Faulkner', 'John Steinbeck'],
            correctAnswer: 'F. Scott Fitzgerald',
          },
        ],
      },
      {
        id: 'british_lit',
        name: 'British Literature',
        parentId: 'literature',
        questions: [
          {
            text: 'Which of these is a famous play by William Shakespeare?',
            options: ['Hamlet', 'The Odyssey', 'Don Quixote', 'War and Peace'],
            correctAnswer: 'Hamlet',
          },
        ],
      },
    ],
  },
  {
    id: 'history',
    name: 'History',
    parentId: null,
    questions: [],
    children: [
      {
        id: 'world_history',
        name: 'World History',
        parentId: 'history',
        questions: [
          {
            text: 'The Magna Carta was a document signed in which country?',
            options: ['England', 'France', 'Spain', 'Italy'],
            correctAnswer: 'England',
          },
          {
            text: 'The ancient city of Rome was built on how many hills?',
            options: ['Seven', 'Five', 'Nine', 'Three'],
            correctAnswer: 'Seven',
          }
        ]
      }
    ]
  },
];
