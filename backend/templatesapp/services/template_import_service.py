from django.apps import apps
from django.db import transaction
from django.utils import timezone
from datetime import timedelta
from ..models import Template

class TemplateImportService:
    @staticmethod
    @transaction.atomic
    def import_template_to_project(template_id, project_id, user=None):
        """
        Clones all tasks, milestones, and dependencies from a Template and attaches them to a specific Project.
        """
        ProjectModel = apps.get_model('Project', 'Project')
        ProjectMilestone = apps.get_model('Project', 'ProjectMilestone')
        TaskModel = apps.get_model('Project', 'Task') 
        
        template = Template.all_objects.prefetch_related('template_tasks').get(id=template_id)
        project = ProjectModel.all_objects.get(id=project_id)
        
        template.usage_count += 1
        template.save(update_fields=['usage_count'])
        
        # Copy custom columns
        if template.columns:
            if not project.tasks_data:
                project.tasks_data = {}
            project.tasks_data['columns'] = template.columns
            project.save(update_fields=['tasks_data'])

        # Copy default members
        if template.default_members:
            current_team = project.team_data if isinstance(project.team_data, list) else []
            for member in template.default_members:
                if member not in current_team:
                    current_team.append(member)
            project.team_data = current_team
            project.save(update_fields=['team_data'])

        base_date = timezone.now().date()

        # Copy milestones
        if template.milestones:
            for ms in template.milestones:
                ms_due = None
                if 'due_days_after' in ms:
                    ms_due = base_date + timedelta(days=ms['due_days_after'])
                ProjectMilestone.objects.create(
                    project=project,
                    title=ms.get('title', 'Milestone'),
                    due_date=ms_due,
                    status='pending'
                )
        
        # Two-pass task cloning to handle dependencies and parent/child relationships
        task_mapping = {} # Map TemplateTask ID -> new Task instance
        created_tasks = []
        
        from ..models import TemplateTask
        template_tasks = TemplateTask.all_objects.filter(template=template).order_by('order', 'created_at')
        
        # Pass 1: Create all tasks
        for tmpl_task in template_tasks:
            due_date = None
            if tmpl_task.due_days_after_project_creation is not None:
                due_date = base_date + timedelta(days=tmpl_task.due_days_after_project_creation)
                
            new_task = TaskModel.objects.create(
                project=project,
                title=tmpl_task.title,
                description=tmpl_task.description,
                priority=tmpl_task.priority,
                status=tmpl_task.default_status or 'pending',
                due_date=due_date or base_date,
            )
            task_mapping[tmpl_task.id] = new_task
            created_tasks.append(new_task)
            
        # Pass 2: Establish relationships
        for tmpl_task in template_tasks:
            new_task = task_mapping[tmpl_task.id]
            needs_save = False
            
            # Map parent task
            if tmpl_task.parent_task_id and tmpl_task.parent_task_id in task_mapping:
                new_task.parent_task = task_mapping[tmpl_task.parent_task_id]
                needs_save = True
                
            if needs_save:
                new_task.save()
                
            # Map dependencies
            deps = tmpl_task.dependencies.all()
            if deps.exists():
                for dep in deps:
                    if dep.id in task_mapping:
                        new_task.blocking_dependencies.add(task_mapping[dep.id])

        return {
            "message": f"Successfully imported {len(created_tasks)} tasks from '{template.title}'",
            "project_id": project.id,
            "tasks_created": len(created_tasks)
        }

    @staticmethod
    @transaction.atomic
    def import_template_to_board(template_id, board_id, user=None):
        """
        Clones columns and tasks from a Market Template and attaches them to a specific Board.
        """
        BoardModel = apps.get_model('boards', 'Board')
        ColumnModel = apps.get_model('boards', 'Column')
        CardModel = apps.get_model('boards', 'Card')
        
        template = Template.all_objects.prefetch_related('template_tasks').get(id=template_id)
        board = BoardModel.objects.get(id=board_id)
        
        template.usage_count += 1
        template.save(update_fields=['usage_count'])
        
        # 1. Create Columns
        column_mapping = {} # Store { 'status_id' : Column instance }
        if template.columns:
            for idx, col_data in enumerate(template.columns):
                # Ensure the column title isn't empty
                col_title = col_data.get('title', f"Column {idx+1}")
                col_id = col_data.get('id', col_title.lower())
                
                new_col = ColumnModel.objects.create(
                    board=board,
                    title=col_title,
                    color=col_data.get('color', 'bg-primary'),
                    order=idx
                )
                column_mapping[col_id] = new_col
                column_mapping[col_title.lower()] = new_col # Fallback mapping
        
        # Ensure we have at least one column as fallback
        if not column_mapping:
            col_todo = ColumnModel.objects.create(board=board, title="To Do", order=0, color="bg-muted-foreground")
            col_inprogress = ColumnModel.objects.create(board=board, title="In Progress", order=1, color="bg-primary")
            col_done = ColumnModel.objects.create(board=board, title="Done", order=2, color="bg-success")
            
            column_mapping['todo'] = col_todo
            column_mapping['pending'] = col_todo
            column_mapping['open'] = col_todo
            
            column_mapping['in_progress'] = col_inprogress
            column_mapping['in-progress'] = col_inprogress
            column_mapping['development'] = col_inprogress
            
            column_mapping['done'] = col_done
            column_mapping['completed'] = col_done
            column_mapping['resolved'] = col_done

        first_column = list(column_mapping.values())[0]

        # 2. Create Cards (from Template Tasks)
        created_cards = 0
        from ..models import TemplateTask
        template_tasks = TemplateTask.all_objects.filter(template=template).order_by('order', 'created_at')
        for idx, tmpl_task in enumerate(template_tasks):
            # Figure out which column it belongs to based on status
            target_col = column_mapping.get(tmpl_task.default_status, column_mapping.get(tmpl_task.default_status.lower(), first_column))
            
            CardModel.objects.create(
                column=target_col,
                title=tmpl_task.title,
                description=tmpl_task.description,
                priority=tmpl_task.priority,
                status=tmpl_task.default_status or 'open',
                order=idx,
                created_by=user
            )
            created_cards += 1

        return {
            "message": f"Successfully imported {created_cards} cards from '{template.title}'",
            "board_id": board.id,
            "cards_created": created_cards
        }