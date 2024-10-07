const execute = async (name) => {
    return { greeting: `Hello, ${name}!` };
};

const details = {
    name: 'greetUser',
    parameters: {
        type: 'object',
        properties: {
            name: {
                type: 'string',
                description: 'Name of the user to greet'
            }
        },
        required: ['name']
    },
    description: 'This function greets a user by name.'
};

export { execute, details };
