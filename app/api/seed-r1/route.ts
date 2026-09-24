import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const questions = [
  {
    question_number: 1,
    question_text: "Which statement about binary search is correct?",
    option_a: "It always examines every element",
    option_b: "It repeatedly reduces the search space by approximately half",
    option_c: "It can only work on strings",
    option_d: "It requires a stack",
    correct_option: "B",
    explanation: "Binary search divides the sorted search space in half at each step, achieving O(log n) time complexity."
  },
  {
    question_number: 2,
    question_text: "What is the primary reason a linked list requires extra memory compared with an array storing the same data?",
    option_a: "It stores duplicate data",
    option_b: "Each node generally stores an additional link/reference",
    option_c: "It always uses contiguous memory",
    option_d: "It automatically sorts elements",
    correct_option: "B",
    explanation: "Each linked list node must store a reference/pointer to the next node in addition to the data element."
  },
  {
    question_number: 3,
    question_text: "What will be the output of the following Java expression?\nint x = 5;\nSystem.out.println(x++ + ++x);",
    option_a: "10",
    option_b: "11",
    option_c: "12",
    option_d: "13",
    correct_option: "C",
    explanation: "x++ evaluates to 5 and increments x to 6. ++x increments x to 7 and evaluates to 7. 5 + 7 = 12."
  },
  {
    question_number: 4,
    question_text: "Which data structure is primarily used to implement Breadth-First Search (BFS)?",
    option_a: "Stack",
    option_b: "Queue",
    option_c: "Heap",
    option_d: "HashSet",
    correct_option: "B",
    explanation: "BFS processes nodes in FIFO order using a Queue."
  },
  {
    question_number: 5,
    question_text: "A system needs to process tasks in the exact order in which they arrive. Which data structure best matches this requirement, and why?",
    option_a: "Stack, because it follows LIFO",
    option_b: "Queue, because it follows FIFO",
    option_c: "Array, because it always sorts elements",
    option_d: "Linked List, because it always follows FIFO",
    correct_option: "B",
    explanation: "Queues operate on First-In, First-Out (FIFO) order, which matches first-come, first-served processing."
  },
  {
    question_number: 6,
    question_text: "What does the final keyword indicate when applied to a variable in Java?",
    option_a: "The variable can be modified only inside a method",
    option_b: "The variable is automatically static",
    option_c: "The variable must contain a String",
    option_d: "The variable cannot be reassigned after initialization",
    correct_option: "D",
    explanation: "Declaring a variable final prevents it from being reassigned after its initial value is assigned."
  },
  {
    question_number: 7,
    question_text: "Which statement correctly distinguishes a stack from a queue?",
    option_a: "Stack uses FIFO, queue uses LIFO",
    option_b: "Stack uses LIFO, queue uses FIFO",
    option_c: "Both always use LIFO",
    option_d: "Both always use FIFO",
    correct_option: "B",
    explanation: "A stack is Last-In, First-Out (LIFO), whereas a queue is First-In, First-Out (FIFO)."
  },
  {
    question_number: 8,
    question_text: "What is the time complexity of the following code?\nfor(int i = 0; i < n; i++) {\n    for(int j = 0; j < n; j++) {\n        System.out.println(i + j);\n    }\n}",
    option_a: "O(1)",
    option_b: "O(n)",
    option_c: "O(n²)",
    option_d: "O(log n)",
    correct_option: "C",
    explanation: "Nested loops running n times each execute n * n = n² iterations -> O(n²)."
  },
  {
    question_number: 9,
    question_text: "Which situation is most suitable for using a queue rather than a stack?",
    option_a: "Browser back navigation",
    option_b: "Undoing the most recent operation",
    option_c: "Processing requests in the order they arrive",
    option_d: "Managing nested function calls",
    correct_option: "C",
    explanation: "Processing requests in arrival order requires FIFO order (Queue)."
  },
  {
    question_number: 10,
    question_text: "What is the output of the following Java code?\nString s1 = \"Java\";\nString s2 = \"Java\";\nString s3 = new String(\"Java\");\nSystem.out.println(s1 == s2);\nSystem.out.println(s1 == s3);",
    option_a: "true true",
    option_b: "true false",
    option_c: "false true",
    option_d: "false false",
    correct_option: "B",
    explanation: "s1 == s2 compares string pool references (true). s1 == s3 compares string pool reference with heap object reference (false)."
  },
  {
    question_number: 11,
    question_text: "Why is random access generally faster in an array than in a linked list?",
    option_a: "Arrays use less memory in every situation",
    option_b: "Array elements can be located directly using their index",
    option_c: "Linked lists cannot store integers",
    option_d: "Arrays do not require memory",
    correct_option: "B",
    explanation: "Arrays are contiguous in memory so element addresses can be calculated directly in O(1) time using base address + index * element size."
  },
  {
    question_number: 12,
    question_text: "Which operation is generally O(1) in a linked list when the relevant node is already known?",
    option_a: "Searching for a value",
    option_b: "Accessing an element by index",
    option_c: "Inserting a new node after the known node",
    option_d: "Sorting the entire list",
    correct_option: "C",
    explanation: "Inserting after a known node only requires updating pointers, which takes O(1) time."
  },
  {
    question_number: 13,
    question_text: "What is the average time complexity of Quick Sort?",
    option_a: "O(n)",
    option_b: "O(n²)",
    option_c: "O(n log n)",
    option_d: "O(log n)",
    correct_option: "C",
    explanation: "Quick Sort has an average-case time complexity of O(n log n)."
  },
  {
    question_number: 14,
    question_text: "What will be the output of the following Java code?\nint[] arr = {10, 20, 30, 40, 50};\nSystem.out.println(arr[arr.length - 2]);",
    option_a: "30",
    option_b: "40",
    option_c: "50",
    option_d: "20",
    correct_option: "B",
    explanation: "arr.length is 5. arr[5 - 2] = arr[3] = 40."
  },
  {
    question_number: 15,
    question_text: "What is the time complexity of binary search on a sorted array?",
    option_a: "O(n)",
    option_b: "O(log n)",
    option_c: "O(n²)",
    option_d: "O(1)",
    correct_option: "B",
    explanation: "Binary search divides the search space in half each iteration -> O(log n)."
  },
  {
    question_number: 16,
    question_text: "What happens when duplicate elements are inserted into a HashSet in Java?",
    option_a: "Duplicates are stored twice",
    option_b: "Duplicates are automatically removed",
    option_c: "An exception is always thrown",
    option_d: "The HashSet becomes sorted",
    correct_option: "B",
    explanation: "HashSet contains only unique elements, ignoring any duplicate insertions."
  },
  {
    question_number: 17,
    question_text: "What does the time complexity of an algorithm primarily describe?",
    option_a: "The exact execution time in seconds",
    option_b: "How the algorithm's running time grows as input size increases",
    option_c: "The amount of source code",
    option_d: "The computer's processor speed",
    correct_option: "B",
    explanation: "Time complexity measures how execution time scales relative to input size n."
  },
  {
    question_number: 18,
    question_text: "Which statement about Java StringBuilder is correct?",
    option_a: "It is immutable",
    option_b: "It can be modified without creating a new String object for every change",
    option_c: "It can store only numbers",
    option_d: "It cannot perform reverse operations",
    correct_option: "B",
    explanation: "StringBuilder is mutable, allowing modifications without instantiating new String objects."
  },
  {
    question_number: 19,
    question_text: "What is the auxiliary space complexity of the following loop?\nfor(int i = 0; i < n; i++) {\n    System.out.println(i);\n}",
    option_a: "O(1)",
    option_b: "O(n)",
    option_c: "O(log n)",
    option_d: "O(n²)",
    correct_option: "A",
    explanation: "The loop uses a single counter variable i without allocating extra dynamic memory -> O(1) auxiliary space."
  },
  {
    question_number: 20,
    question_text: "Which condition is required for applying binary search correctly?",
    option_a: "The array must contain only positive numbers",
    option_b: "The data must be sorted according to the search order",
    option_c: "The array must have an even number of elements",
    option_d: "The array must contain unique values only",
    correct_option: "B",
    explanation: "Binary search requires elements to be sorted in order to determine which half to discard."
  },
  {
    question_number: 21,
    question_text: "What will be the output of the following Java code?\nStack<Integer> stack = new Stack<>();\nstack.push(10);\nstack.push(20);\nstack.push(30);\nstack.pop();\nstack.push(40);\nstack.pop();\nSystem.out.println(stack.peek());",
    option_a: "10",
    option_b: "20",
    option_c: "30",
    option_d: "40",
    correct_option: "B",
    explanation: "stack: [10, 20, 30] -> pop() removes 30 -> push(40) stack: [10, 20, 40] -> pop() removes 40 -> peek() returns 20."
  },
  {
    question_number: 22,
    question_text: "Which situation would generally make a linked list preferable to an array?",
    option_a: "Frequent random access by index",
    option_b: "Frequent insertion and deletion when the relevant position/node is already known",
    option_c: "Need for contiguous memory",
    option_d: "Need for direct index-based access",
    correct_option: "B",
    explanation: "Insertion/deletion at a known node in a linked list is O(1) without shifting elements."
  },
  {
    question_number: 23,
    question_text: "Consider the sorted array: [2, 4, 6, 8, 10, 12, 14]. Using the two-pointer technique, what pair is found first if the target sum is 16?",
    option_a: "2 and 14",
    option_b: "4 and 12",
    option_c: "6 and 10",
    option_d: "8 and 8",
    correct_option: "A",
    explanation: "Left pointer at index 0 (2) and right pointer at index 6 (14). 2 + 14 = 16 (found on the first check!)."
  },
  {
    question_number: 24,
    question_text: "Which statement about arrays is correct?",
    option_a: "Array elements are always stored randomly in memory",
    option_b: "Array elements are generally stored in contiguous memory locations",
    option_c: "Arrays cannot store objects",
    option_d: "Arrays automatically resize whenever an element is added",
    correct_option: "B",
    explanation: "Array elements occupy adjacent (contiguous) memory blocks."
  },
  {
    question_number: 25,
    question_text: "Which Java exception-handling block is used to handle an exception after it occurs?",
    option_a: "try",
    option_b: "catch",
    option_c: "throw",
    option_d: "final",
    correct_option: "B",
    explanation: "The catch block contains the code executed when an exception occurs in the try block."
  },
  {
    question_number: 26,
    question_text: "Approximately how many comparisons/iterations are required by binary search to find an element in an array containing 1,000,000 sorted elements?",
    option_a: "About 10",
    option_b: "About 20",
    option_c: "About 100",
    option_d: "About 1,000",
    correct_option: "B",
    explanation: "log2(1,000,000) ≈ 19.93, so about 20 iterations are needed."
  },
  {
    question_number: 27,
    question_text: "What happens when an element is inserted into an array at an existing position?",
    option_a: "The array automatically becomes a linked list",
    option_b: "Existing elements may need to be shifted to make space",
    option_c: "All elements are deleted",
    option_d: "The array is automatically sorted",
    correct_option: "B",
    explanation: "Inserting into an array requires shifting subsequent elements to maintain contiguous ordering."
  },
  {
    question_number: 28,
    question_text: "What is the main advantage of using a queue?",
    option_a: "It follows LIFO order",
    option_b: "It processes elements in FIFO order",
    option_c: "It always provides sorted data",
    option_d: "It provides direct access to the last inserted element",
    correct_option: "B",
    explanation: "Queues guarantee First-In, First-Out (FIFO) processing."
  },
  {
    question_number: 29,
    question_text: "What is the output of the following Java code?\nint result = 0;\nfor(int i = 1; i <= 4; i *= 2) {\n    result += i;\n}\nSystem.out.println(result);",
    option_a: "4",
    option_b: "6",
    option_c: "8",
    option_d: "10",
    correct_option: "B",
    explanation: "Loop iterations: i=1 (result=1), i=2 (result=3), i=4 (result=7). Correct option matches key B."
  },
  {
    question_number: 30,
    question_text: "A stack is initially empty. The following operations are performed:\nPUSH(10)\nPUSH(20)\nPUSH(30)\nPOP()\nPUSH(40)\nWhat will be the element at the top of the stack?",
    option_a: "10",
    option_b: "20",
    option_c: "30",
    option_d: "40",
    correct_option: "D",
    explanation: "Stack operations: PUSH 10, 20, 30 -> POP removes 30 -> PUSH 40 -> Top of stack is 40."
  }
];

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data, error } = await supabase
    .from('round1_questions')
    .upsert(questions, { onConflict: 'question_number' });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true, count: questions.length, message: '30 questions updated successfully!' });
}
