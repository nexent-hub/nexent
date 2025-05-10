from fastapi import HTTPException

from .client import get_db_session, as_dict
from .db_models import ToolInfo, AgentInfo, UserAgent, ToolInstance


def update_tools(tools):
    """
    Update the ToolInfo table based on the provided list of tools.

    :param tools: List of dictionaries representing tools, each containing tool information
    :return: None
    """
    with get_db_session() as session:
        # Query all existing ToolInfo records from the database
        existing_tools = {tool.name: tool for tool in session.query(ToolInfo).filter(ToolInfo.delete_flag != 'Y').all()}

        tool_names_in_input = {tool['name'] for tool in tools}

        # Handle new or updated tools
        for tool in tools:
            tool_name = tool['name']
            if tool_name in existing_tools:
                # Check if the tool needs to be updated
                existing_tool = existing_tools[tool_name]
                for key, value in tool.items():
                    if hasattr(existing_tool, key) and getattr(existing_tool, key) != value:
                        setattr(existing_tool, key, value)
                existing_tool.delete_flag = 'N'
            else:
                # Insert new tool
                new_tool = ToolInfo(**tool)
                new_tool.delete_flag = 'N'
                session.add(new_tool)

        # Mark deleted tools
        for name in set(existing_tools.keys()) - tool_names_in_input:
            existing_tools[name].delete_flag = 'Y'


def query_agents(tenant_id: str = None, user_id: str = None):
    """
    Query the TenantAgent list based on the optional tenant_id.
    Filter out records with delete_flag set to 'Y'.

    :param tenant_id: Optional tenant ID for filtering
    :param user_id: Optional user ID for merging
    :return: List of TenantAgent objects that meet the criteria
    """
    with get_db_session() as session:
        query = session.query(AgentInfo).filter(AgentInfo.delete_flag != 'Y')
        if tenant_id:
            query = query.filter(AgentInfo.tenant_id == tenant_id)
        agents = query.all()

        if not user_id:
            return agents

        user_agents = session.query(UserAgent).filter(
            UserAgent.tenant_id == tenant_id,
            UserAgent.user_id == user_id,
            UserAgent.delete_flag != 'Y'
        ).all()

        agent_dict = {str(agent.agent_id): agent for agent in agents}

        for user_agent in user_agents:
            agent_id = str(user_agent.agent_id)
            if agent_id in agent_dict:
                agent_info = agent_dict[agent_id]
                for key, value in user_agent.__dict__.items():
                    if key not in ['_sa_instance_state', 'agent_id'] and hasattr(agent_info, key):
                        setattr(agent_info, key, value)

        return [as_dict(agent) for agent in agents]


def create_agent(agent_info):
    """
    Create a new agent in the database.
    :param agent_info: Dictionary containing agent information
    :return: Created agent object
    """
    with get_db_session() as session:
        new_agent = AgentInfo(**agent_info)
        new_agent.delete_flag = 'N'
        session.add(new_agent)
        session.flush()
        return as_dict(new_agent)


def update_agent(agent_id, agent_info):
    """
    Update an existing agent in the database.
    :param agent_id: ID of the agent to update
    :param agent_info: Dictionary containing updated agent information
    :return: Updated agent object
    """
    with get_db_session() as session:
        agent = session.query(AgentInfo).filter(AgentInfo.agent_id == agent_id).first()
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")

        for key, value in agent_info.items():
            setattr(agent, key, value)


def create_or_update_user_agent(agent_info, tenant_id: str = None, user_id: str = None):
    """
    Create or update a user agent in the database.
    :param agent_info: Dictionary containing user agent information
    :param tenant_id: Optional tenant ID for filtering
    :param user_id: Optional user ID for merging
    :return: Created or updated user agent object
    """
    with get_db_session() as session:
        user_agent = session.query(UserAgent).filter(
            UserAgent.tenant_id == tenant_id,
            UserAgent.user_id == user_id,
            UserAgent.agent_id == agent_info['agent_id'],
            UserAgent.delete_flag != 'Y'
        ).first()
        if not user_agent:
            new_user_agent = UserAgent(**agent_info)
            new_user_agent.delete_flag = 'N'
            session.add(new_user_agent)
            session.flush()
            return as_dict(new_user_agent)

        for key, value in agent_info.items():
            setattr(user_agent, key, value)


def create_or_update_tool(tool_info, tenant_id: str, agent_id: int, user_id: str = None):
    """
    Create or update a ToolInstance in the database based on tenant_id and agent_id, optional user_id.

    :param tool_info: Dictionary containing tool information
    :param tenant_id: Tenant ID for filtering, mandatory
    :param user_id: Optional user ID for filtering
    :param agent_id: Optional agent ID for filtering
    :return: Created or updated ToolInstance object
    """
    # Add tenant_id and user_id to tool_info
    tool_info['tenant_id'] = tenant_id
    tool_info['user_id'] = user_id

    with get_db_session() as session:
        # Query if there is an existing ToolInstance
        query = session.query(ToolInstance).filter(ToolInstance.tenant_id == tenant_id).filter(
            ToolInstance.agent_id == agent_id)
        if user_id:
            query = query.filter(ToolInstance.user_id == user_id)

        tool_instance = query.first()

        if tool_instance:
            # Update the existing ToolInstance
            for key, value in tool_info.items():
                if hasattr(tool_instance, key):
                    setattr(tool_instance, key, value)
        else:
            # Create a new ToolInstance
            new_tool_instance = ToolInstance(**tool_info)
            session.add(new_tool_instance)
            tool_instance = new_tool_instance

        session.flush()
        return tool_instance
