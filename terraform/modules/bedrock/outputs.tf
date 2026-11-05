output "agent_id" {
  value = aws_bedrockagent_agent.main.agent_id
}

output "agent_alias_id" {
  value = aws_bedrockagent_agent_alias.main.agent_alias_id
}

output "knowledge_base_id" {
  value = aws_bedrockagent_knowledge_base.main.id
}
