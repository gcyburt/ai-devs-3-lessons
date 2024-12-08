export type Payload = {
    task: string;
    answer: Answers;
    apiKey: string;
}

export type Answers = {
    [key: string]: string;
}
