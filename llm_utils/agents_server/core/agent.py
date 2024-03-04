
class Agent:
    def __init__(self, name, messages, tools, environment, max_actions=100):
        self.name = name
        self.actions = []
        # self.instructions = instructions
        # self.messages = messages
        self.tools = tools
        self.max_actions = max_actions

        self.states = []
        self.observations = []
        self.environment = environment

    def next_action(self, model):
        raise NotImplementedError

    def run_action(self):
        raise NotImplementedError

    def update_environment(self):
        pass
