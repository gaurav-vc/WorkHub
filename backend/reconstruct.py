import os

recovered_path = r"c:\Users\MC VIP\OneDrive\Documents\project\frontend\src\pages\UsersRoles_recovered.tsx"
final_path = r"c:\Users\MC VIP\OneDrive\Documents\project\frontend\src\pages\UsersRoles.tsx"

missing_block = """          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Users & Roles</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage roles, users, and reporting structure. Roles define permissions, which users inherit.
          </p>
        </div>
        <div>
          {activeTab === 'roles' ? (
            <Dialog open={isRoleModalOpen} onOpenChange={setIsRoleModalOpen}>
              <Button onClick={openAddRole}>
                <Plus className="h-4 w-4 mr-2" /> Add Role
              </Button>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>{editRoleId ? "Edit Role" : "New Role"}</DialogTitle>
                  <CardDescription>Fields are linked to keep your hierarchy consistent.</CardDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Role Configuration</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Role Name <span className="text-red-500">*</span></Label>
                      <Input placeholder="e.g. Site Manager" value={newRole.name} onChange={e => setNewRole({...newRole, name: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Role Code <span className="text-red-500">*</span></Label>
                      <Input placeholder="SITE_MGR" value={newRole.code} onChange={e => setNewRole({...newRole, code: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Department</Label>
                      <Select value={newRole.dept} onValueChange={(v) => setNewRole({...newRole, dept: v})}>
                        <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                        <SelectContent>
                          {departments.map(d => (
                            <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Access Scope</Label>
                      <Select value={newRole.scope} onValueChange={v => setNewRole({...newRole, scope: v})}>
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Corporate">Corporate</SelectItem>
                          <SelectItem value="Region">Region</SelectItem>
                          <SelectItem value="Site">Site</SelectItem>
                          <SelectItem value="Self">Self</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Dashboard Type</Label>
                      <Select value={newRole.dashboard} onValueChange={v => setNewRole({...newRole, dashboard: v})}>
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Standard">Standard</SelectItem>
                          <SelectItem value="Executive">Executive</SelectItem>
                          <SelectItem value="Manager">Manager</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 flex flex-col justify-center">
                      <Label className="mb-2">Can Manage Users</Label>
                      <Switch checked={newRole.canManageUsers} onCheckedChange={v => setNewRole({...newRole, canManageUsers: v})} />
                    </div>
                    <div className="space-y-2 flex flex-col justify-center">
                      <Label className="mb-2">Can Approve</Label>
                      <Switch checked={newRole.canApprove} onCheckedChange={v => setNewRole({...newRole, canApprove: v})} />
                    </div>"""

with open(recovered_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
inserted = False
for line in lines:
    if "MISSING LINE" in line:
        if not inserted:
            new_lines.append(missing_block + "\n")
            inserted = True
    else:
        new_lines.append(line)

with open(final_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("File reconstructed successfully.")
