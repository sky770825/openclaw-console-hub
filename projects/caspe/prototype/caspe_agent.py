import json
import yaml
import os

class CASPEAgent:
    def __init__(self, policy_path, graph_path):
        self.policies = self.load_yaml(policy_path)
        self.system_graph = self.load_json(graph_path)
        self.violations = []

    def load_yaml(self, path):
        with open(path, 'r') as f:
            return yaml.safe_load(f)

    def load_json(self, path):
        with open(path, 'r') as f:
            return json.load(f)

    def analyze_data_flow(self):
        print("[*] Analyzing Data Flow Policies...")
        edges = self.system_graph.get('edges', [])
        nodes = {n['id']: n for n in self.system_graph.get('nodes', [])}

        for policy in self.policies['policies']:
            if policy['type'] == 'DataFlow':
                for edge in edges:
                    src = nodes.get(edge['source'])
                    dst = nodes.get(edge['target'])
                    
                    # 檢查標籤匹配 (例如 internal -> external)
                    src_tags = src.get('tags', [])
                    dst_tags = dst.get('tags', [])
                    
                    policy_src_tag = policy['context'].get('source_tag')
                    policy_dst_tag = policy['context'].get('destination_tag')

                    if policy_src_tag in src_tags and policy_dst_tag in dst_tags:
                        for rule in policy['rules']:
                            # 檢查違規：如果是 DENY 且數據類型匹配
                            if rule['action'] == 'DENY':
                                if any(data_item in edge['data'] or rule['data_type'] in str(edge['data']) for data_item in edge['data']):
                                    # 模擬情境檢查 (is_encrypted)
                                    # 在原型中，我們假設 http 是未加密的，https 是加密的
                                    is_encrypted = edge.get('protocol') == 'https'
                                    if rule['condition'] == 'is_encrypted == false' and not is_encrypted:
                                        self.violations.append({
                                            "policy_id": policy['id'],
                                            "type": "DataFlow Violation",
                                            "message": f"Sensitive data '{rule['data_type']}' flowing from {edge['source']} to {edge['target']} over unencrypted {edge['protocol']}",
                                            "suggestion": f"Enforce HTTPS/TLS for the connection between {edge['source']} and {edge['target']}"
                                        })

    def analyze_access_control(self):
        print("[*] Analyzing Access Control Policies...")
        edges = self.system_graph.get('edges', [])
        
        for policy in self.policies['policies']:
            if policy['type'] == 'AccessControl':
                for rule in policy['rules']:
                    allowed_calls = rule.get('can_call', [])
                    service = rule.get('service')
                    
                    # 找出所有該 service 發出的呼叫
                    actual_calls = [e['target'] for e in edges if e['source'] == service]
                    
                    for call in actual_calls:
                        if call not in allowed_calls:
                            self.violations.append({
                                "policy_id": policy['id'],
                                "type": "AccessControl Violation",
                                "message": f"Unauthorized call: service '{service}' is calling '{call}', which is not in the allowed list: {allowed_calls}",
                                "suggestion": f"Restrict network access or update policy to allow {service} -> {call}"
                            })

    def run(self):
        self.analyze_data_flow()
        self.analyze_access_control()
        return self.violations

if __name__ == "__main__":
    # 這裡僅供測試腳本用，實際會從外部傳入
    pass
